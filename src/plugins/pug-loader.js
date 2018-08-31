const webpack = require("webpack")
const loaderUtil = require("loader-utils")
const pug = require("pug")
const pugLex = require("pug-lexer")
// const pugParse = require("pug-parser")
const pugWalk = require("pug-walk")

const nzStyle = require("@anzar/style")
const stylusLoader = require("./stylus-loader")
const utils = require("./utils")
const styleRegistry = require("./style")


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
        return `module.exports=${JSON.stringify(template(locals))};`
    }
    result.dependencies = template.dependencies
    return result
}


function pugPlugin(loader) {
    function replaceNormalClassNames(input, replacer) {

    }

    return {
        resolve(request, resourcePath, options) {
            return utils.resolvePathSync(loader, resourcePath, request, [".pug"])
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
        }
    }
}


module.exports = function pugTemplateLoader(content) {
    // this.cacheable && this.cacheable()

    // const done = this.async()
    const options = loaderUtil.getOptions(this) || {}

    let data = {}
    // utils.extendDataWithDefines(this, data)

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

    ctx.data.style = (...classNames) => {
        let res = []
        for (let cls of classNames) {
            res = res.concat(cls.split(/\s+(?!,)|(?:\s*,\s*)/))
        }
        return res
    }

    ctx.filters.stylus = (text, attrs) => {
        const styl = stylusLoader.loadStylus(this, text, this.resourcePath, {
            define: ctx.data,
            ...options.stylus
        })
        const css = styl.render()
        styl.deps().forEach(this.addDependency)

        if (attrs.shadow) {
            return `<style type="text/css">\n${css}</style>`
        } else {
            const loader = new nzStyle.CssLoader()
            loader.load(css)
            ctx.data.style = nzStyle.newStyle(styleRegistry.get("global"), loader)
            // ctx.data.style = styleRegistry.get(options.group || "all", options.scope).loadCss(css)
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
    return template(ctx.data)
}
