const shortid = require("shortid")
const path = require("path")
const fs = require("fs")
const SVGIcons2SVGFont = require("svgicons2svgfont")
const deasync = require("deasync")
const svg2ttf = require("svg2ttf")
const ttf2woff = require("ttf2woff")
const { PassThrough } = require("stream")

const util = require("./utils")


class IconRegistry {
    constructor() {
        this.packages = {}
        this.nextCodepoint = 0xE001
    }

    addPackage(name, weight) {
        if (!this.packages[name]) {
            this.packages[name] = {
                name,
                weight: weight || 400,
                icons: {},
                family: "iconfont"
            }
        }
    }

    add(packageName, iconPath, size) {
        let pkg = this.packages[packageName]
        size = size || 24

        if (typeof size === "number") {
            size = size + "px"
        }

        if (pkg == null) {
            this.addPackage(packageName)
            pkg = this.packages[packageName]
        }

        if (!pkg.icons[iconPath]) {
            pkg.icons[iconPath] = {
                codepoint: this.nextCodepoint++,
                name: `${packageName}-${path.basename(iconPath).replace(/\.svg/i, "")}`
            }
        }

        let css = `css-${size}`
        let data = pkg.icons[iconPath]
        if (!data[css]) {
            let clsName = "I" + shortid.generate()
            data[css] = {
                clsName,
                css: `.${clsName}::before {
                    display: inline-block;
                    content: "\\${data.codepoint.toString(16)}";
                    font: normal ${pkg.weight} ${size}/1 ${pkg.family};
                    display: inline-block;
                    vertical-align: middle;
                    text-align: center;
                }`
            }
        }
        return data[css]
    }

    getGlobalCss() {
        let svgFont = this.renderFontSync()
        if (svgFont && svgFont.length) {
            let ttf = svg2ttf(svgFont)
            let woff = ttf2woff(ttf.buffer)
            let buffer = Buffer.from(woff.buffer)
            let dataUrl = `data:application/x-font-woff;charset=utf-8;base64,${buffer.toString("base64")}`
            return "@font-face{" +
                "font-family:'iconfont';" +
                "font-weight:400;" +
                "font-style:normal;" +
                "src: url(" + dataUrl + ");" +
                "}"
        } else {
            return ""
        }
    }

    async renderFont() {
        return new Promise((resolve, reject) => {
            let res = Buffer.alloc(0)
            let font = new SVGIcons2SVGFont({
                fontName: "iconfont",
                fontHeight: 1024,
                fontWeight: 400,
                fontStyle: "normal"
            })

            font
                .on("data", (data) => {
                    res = Buffer.concat([res, data])
                })
                .on("error", (error) => {
                    reject(error)
                })
                .on("finish", () => {
                    resolve(res.toString())
                })

            let gc = 0
            for (let pkgName in this.packages) {
                let pkg = this.packages[pkgName]
                for (let iconPath in pkg.icons) {
                    let icon = pkg.icons[iconPath]
                    let glyph = fs.createReadStream(iconPath)
                    glyph.metadata = {
                        name: icon.name,
                        unicode: [String.fromCharCode(icon.codepoint)]
                    }
                    font.write(glyph)
                    gc++
                }
            }

            if (gc === 0) {
                resolve("")
            } else {
                font.end()
            }
        })
    }

    renderFontSync() {
        let done = 0, success, error
        this.renderFont()
            .then(r => {
                done = 1
                success = r
            })
            .catch(r => {
                done = 2
                error = r
            })

        deasync.loopWhile(() => done === 0)

        if (done === 2) {
            if (error) {
                throw new Error(error)
            } else {
                throw new Error("Unexpected error")
            }
        } else if (done === 1) {
            return success
        }

        return null
    }
}


const icons = new IconRegistry()


function wpFontIcon(loader, contextPath, registry, cssLoader) {
    return (icon, size) => {
        const package = icon.split(/[\\\/]+/)[0]
        const path = util.resolvePathSync(loader, contextPath, icon, [".svg"])
        if (!path) {
            throw new Error(`The requested icon is not found: ${icon}`)
        }
        const data = registry.add(package, path, size)
        cssLoader.load(data.css)
        return data.clsName
    }
}


module.exports = { IconRegistry, icons, wpFontIcon }
