const fs = require("fs")
const path = require("path")
const webpack = require("webpack")
const crypto = require("crypto")
const CleanCSS = require("clean-css")
const { RawSource } = require("webpack-sources")

const { Registry, CssLoader } = require("@anzar/style")

const utils = require("../utils")
const { icons } = require("./iconfont")
const { loadStylus } = require("./stylus")


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


module.exports = class NzStylePlugin {
    constructor(options) {
        if (NzStylePlugin.instance) {
            throw new Error("NzStylePlugin is singleton")
        }

        NzStylePlugin.instance = this

        this.stylesReady = new Promise(resolve => this._stylesReady = () => resolve())
        this.registry = new Registry("global")
        this.cssLoader = new CssLoader()
        this.styles = {}
        this.splitByMedia = options.splitByMedia
        this.outDir = options.outDir

        if (options.skipMangle) {
            this.registry.canMangleName = mangleExlusion(options.skipMangle)
        }
    }

    addExternalStyle(path, content) {
        this._addStyle(path, content, true)
    }

    addProjectStyle(path, content) {
        this._addStyle(path, content, false)
    }

    _addStyle(path, content, isExternal) {
        if (this.styles[path]) {
            if (content) {
                this.styles[path].content = content
            }
        } else {
            if (!content) {
                content = fs.readFileSync(path, { encoding: "utf-8" })
            }
            this.styles[path] = { path, content, isExternal }
        }
    }

    externalStyleLoader() {
        return {
            loader: "nz-style",
            options: {
                isExternal: true
            }
        }
    }

    projectStyleLoader() {
        return {
            loader: "nz-style",
            options: {
                isExternal: false
            }
        }
    }

    apply(compiler) {
        let makeStyles = true
        compiler.hooks.make.tapAsync("NzStylePlugin", (compilation, callback) => {
            if (!makeStyles) {
                return callback()
            }
            makeStyles = false

            const resolvePath = utils.pathResolver(compiler.inputFileSystem, compiler.options.resolve.alias)
            const stylusLoader = compiler.options.module.rules
                .map(rule => {
                    if (Array.isArray(rule.use)) {
                        const loader = rule.use.find(l => l.loader === "stylus-loader")
                        if (loader) {
                            return { test: rule.test, options: loader.options }
                        }
                    }
                    return null
                })
                .filter(v => !!v)[0]



            Object.values(this.styles)
                .filter(v => !v.isExternal)
                .map(v => {
                    let css
                    if (stylusLoader && stylusLoader.test.test(v.path)) {
                        const styl = loadStylus(resolvePath, v.content, v.path, stylusLoader.options)
                        const assets = styl.assets()
                        css = styl.render()

                        for (const assetPath in assets) {
                            compilation.emitAsset(assets[assetPath], new RawSource(fs.readFileSync(assetPath)))
                        }
                    } else {
                        css = v.content
                    }

                    css && this.cssLoader.load(css)
                })

            process.nextTick(() => {
                this._stylesReady()
                callback()
            })
        })

        compiler.hooks.thisCompilation.tap("NzStylePlugin", (compilation) => {
            compilation.hooks.processAssets.tapAsync(
                { name: "NzStylePlugin", stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
                (compilationAssets, callback) => {
                    this.registry.registerUnhandled(this.cssLoader)
                    this.compileStyle()
                        .then(styles => {
                            const external = this.compileExternalStyle()
                            if (external.length) {
                                if (!styles["@global"]) {
                                    styles["@global"] = { content: external }
                                } else {
                                    styles["@global"].content = external + "\n\n" + styles["@global"].content
                                }
                            }

                            for (const groupId in styles) {
                                let { content, group } = styles[groupId]

                                content = CssLoader.minifier.minify(content).styles

                                const fileId = crypto.createHash("md5")
                                    .update(groupId)
                                    .update(content)
                                    .digest("hex")
                                    .substr(0, 10)
                                const filename = `${this.registry.name}.${fileId}.css`
                                const filePath = path.join(this.outDir || "", filename)
                                compilation.emitAsset(filePath, new CssSource(content, group))
                            }

                            callback()
                        })
                        .catch(err => {
                            console.log(err)
                            callback(err)
                        })
                })
        })

        // compiler.hooks.emit.tapAsync("NzStylePlugin", (compilation, callback) => {

        // })
    }

    async loadFile(path) {

    }

    async compileStyle() {
        let result = {}
        let rendered = this.registry.renderCss({
            splitByMedia: this.splitByMedia
        })

        for (let rfile of rendered) {
            let content = rfile.content
            let groupId = rfile.group ? rfile.group.id : "@global"

            if (groupId === "@global") {
                let iconsCss = await icons.getGlobalCss()
                content = iconsCss + content
            }

            result[groupId] = { content, group: rfile.group }
        }

        return result
    }

    compileExternalStyle() {
        return Object.values(this.styles)
            .filter(v => v.isExternal)
            .map(v => v.content)
            .join("\n\n")

    }
}


function mangleExlusion(regex) {
    return function (selector) {
        if (selector.nodes.length) {
            let primary = selector.nodes[0]
            return primary.type === "class" && !regex.test(primary.name)
        }
        return true
    }
}


module.exports.CssSource = CssSource
