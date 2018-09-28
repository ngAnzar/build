const loaderUtil = require("loader-utils")
const CleanCSS = require("clean-css")
const nzStyle = require("./style")

module.exports = function (content) {
    const options = loaderUtil.getOptions(this) || {}

    if (options.rawCssId) {
        if (!nzStyle.rawCssList[options.rawCssId]) {
            nzStyle.rawCssList[options.rawCssId] = {}
        }
        let css = new CleanCSS({
            inline: false,
            level: 1
        })
        nzStyle.rawCssList[options.rawCssId][this.resourcePath] = css.minify(content).styles
    }

    return "/* EXTRACTED */"
}
