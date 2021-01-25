const webpack = require("webpack")
const loaderUtil = require("loader-utils")
const pug = require("pug")
const pugLex = require("pug-lexer")
// const pugParse = require("pug-parser")
const pugWalk = require("pug-walk")

const nzStyle = require("@anzar/style")
const { loadStylus } = require("./style/stylus")
const utils = require("./utils")
// const styleRegistry = require("./style__")
const iconFont = require("./style/iconfont")
const NzStylePlugin = require("./style/plugin")


function compileClient(loader, content, ctx) {
    let result = (locals) => {
        return `${template.body}
            module.exports = function(locals) {
            return template(Object.assign(${JSON.stringify(locals)},locals||{}));
            }`
    }

    const template = pug.compileClientWithDependenciesTracked(content, ctx)
    result.dependencies = template.dependencies
    return result
}


function compileHtml(loader, content, ctx) {
    let template = pug.compile(content, ctx)

    let result = (locals) => {
        return `module.exports=${JSON.stringify(template(locals).trim())};`
    }
    result.dependencies = template.dependencies
    return result
}


function pugPlugin(loader) {
    return {
        resolve(request, resourcePath, options) {
            return utils.resolvePathSyncFromLoader(loader, resourcePath, request, [".pug"])
        },

        postLoad(ast) {
            return pugWalk(ast,
                // pre
                (node, replace) => {
                    if (node.type === "Tag") {
                        if (node.attrs) {
                            for (let attr of node.attrs) {
                                if (attr.name === "class") {
                                    attr.val = 'style(' + attr.val + ')'
                                }
                            }
                        }
                    }
                },
                // post
                (node, replace) => {

                })
        },

        // postParse: function (ast) {
        //     return pugWalk(ast, (node, replace) => {
        //         if (["Mixin", "MixinBlock", "NamedBlock"].indexOf(node.type) !== -1) {
        //             ast._mustBeInlined = true;
        //         }
        //     });
        // },
    }
}


function loader(content, options, cssPlugin) {
    const params = this.resourceQuery ? loaderUtil.parseQuery(this.resourceQuery) : {}

    let data = {}
    const cssLoader = cssPlugin.cssLoader.newChildLoader()
    const resolvePath = utils.pathResolverFromLoader(this)

    let ctx = Object.assign({
        filename: this.resourcePath,
        doctype: options.doctype || "js",
        compileDebug: this.debug || false
    }, options)

    if (!ctx.data) {
        ctx.data = data
    } else {
        ctx.data = Object.assign(data, ctx.data)
    }

    if (!ctx.filters) {
        ctx.filters = {}
    }

    ctx.data.style = nzStyle.newStyle(cssPlugin.registry, cssLoader)
    ctx.data.icon = iconFont.wpFontIcon(this, this.resourcePath, iconFont.icons, cssLoader)
    ctx.globals = ["require"]

    const stylusOptions = options.stylus || {}
    const stylusDefines = Object.assign({}, stylusOptions.defines || {}, ctx.data)

    ctx.filters.stylus = (text, attrs) => {
        const styl = loadStylus(resolvePath, text, this.resourcePath, {
            ...options.stylus,
            defines: stylusDefines
        })
        const css = styl.render()
        styl.deps().forEach(this.addDependency)

        if (attrs.shadow) {
            return `<style type="text/css">\n${css}</style>`
        } else {
            cssLoader.load(css)
            return ""
        }
    }

    if (!ctx.plugins) {
        ctx.plugins = []
    }

    ctx.plugins.push(pugPlugin(this))

    this.clearDependencies()

    let template
    if (this.loaders.find(loader => /html-webpack-plugin/.test(loader.path))) {
        template = compileClient(this, content, ctx)
    } else {
        template = compileHtml(this, content, ctx)
    }

    template.dependencies.forEach(this.addDependency)

    // if (this.resourcePath.endsWith("browser.pug")) {
    //     console.log(compileHtml(this, content, ctx)(ctx.data))
    // }

    return template(ctx.data)
}



module.exports = function pugTemplateLoader(content, sourceMap, meta) {
    this.cacheable && this.cacheable(false)
    const done = this.async()
    const options = loaderUtil.getOptions(this) || {}
    const cssPlugin = NzStylePlugin.instance

    cssPlugin.stylesReady
        .then(succ => {
            // console.log("pugTemplateLoader stylesReady", this.resourcePath)
            const result = loader.call(this, content, options, cssPlugin)
            done(null, result, sourceMap, meta)
        })
        .catch(done)
}
