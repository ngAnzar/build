const path = require("path")
const crypto = require("crypto")
const { RawSource } = require("webpack-sources")

const { Registry } = require("@anzar/style")


const REGISTRIES = {}


class CssSource extends RawSource {
    constructor(content, group) {
        super(content)
        this.group = group
    }

    get media() {
        if (this.group) {
            if (this.group.kind === "media") {
                return this.group.rule.media
            }
        }
        return "all"
    }
}


module.exports = {
    get(name) {
        const key = `${name}`
        if (REGISTRIES[key] == null) {
            const deps = Object.values(REGISTRIES)
            REGISTRIES[key] = new Registry(name)
            for (let d of deps) {
                REGISTRIES[key].addDependency(d)
            }
        }

        // TODO: valami jobb megoldás kéne erre
        REGISTRIES[key].canMangleName = (selector) => {
            if (selector.nodes.length) {
                let primary = selector.nodes[0]
                return primary.type === "class" && !/^[a-zA-Z]{2,3}-/.test(primary.name)
            }
            return true
        }

        return REGISTRIES[key]
    },

    CssSource: CssSource,

    ExportCssPlugin: class ExportCssPlugin {
        /**
         * splitByMedia: separate css by media queries
         * outDir: output directory for css files
         */
        constructor(options) {
            this.options = options || {}
        }

        apply(compiler) {
            compiler.hooks.emit.tapAsync({ name: "nzStyle", context: true }, (context, compilation, callback) => {
                for (const k in REGISTRIES) {
                    const reg = REGISTRIES[k]
                    let rendered = reg.renderCss({
                        splitByMedia: this.options.splitByMedia
                    })

                    for (let rfile of rendered) {
                        let fileId = crypto.createHash("md5")
                            .update(rfile.group ? rfile.group.id : "@global")
                            .digest("hex")
                            .substr(0, 10)
                        let filename = `${rfile.name}-${fileId}.css`
                        let filePath = path.join(this.options.outDir || "", filename)

                        compilation.assets[filePath] = new CssSource(rfile.content, rfile.group)
                    }
                }
                callback()
            })
        }
    }
}
