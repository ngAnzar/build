const loaderUtils = require("loader-utils")

const NzStylePlugin = require("./plugin")


module.exports = function nzStyleLoader(source) {
    const { isExternal } = loaderUtils.getOptions(this)
    const plugin = NzStylePlugin.instance

    if (isExternal) {
        plugin.addExternalStyle(this.resourcePath, source)
    } else {
        plugin.addProjectStyle(this.resourcePath, source)
    }

    return "/* EXTRACTED */"
}
