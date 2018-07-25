const webpack = require("webpack")
const util = require("loader-utils")
const pug = require("pug")


function extendDataWithDefines(data) {
    if (this._compilation &&
        this._compilation.options &&
        this._compilation.options.plugins) {
        for (let plugin of this._compilation.options.plugins) {
            if (plugin instanceof webpack.DefinePlugin) {
                if (plugin.definitions) {
                    for (let k in plugin.definitions) {
                        switch (typeof plugin.definitions[k]) {
                            case "string":
                                data[k] = JSON.parse(plugin.definitions[k])
                                break
                            default:
                                data[k] = plugin.definitions[k]
                        }
                    }
                }
            }
        }
    }
}


function compileClient(content, ctx) {
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


function compileHtml(content, ctx) {
    let template = pug.compile(content, ctx)

    let result = (locals) => {
        return `module.exports=${JSON.stringify(template(locals))};`
    }
    result.dependencies = template.dependencies
    return result
}


module.exports = function pugTemplateLoader(content) {
    this.cacheable && this.cacheable()

    let data = {}
    extendDataWithDefines.call(this, data)

    const options = util.getOptions(this) || {}
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

    let template
    if (this.loaders.find(loader => /html-webpack-plugin/.test(loader.path))) {
        template = compileClient(content, ctx)
    } else {
        template = compileHtml(content, ctx)
    }

    this.clearDependencies()
    template.dependencies.forEach(this.addDependency)

    return template(ctx.data)
}
