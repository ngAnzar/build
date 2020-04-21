const fs = require("fs")
const loaderUtil = require("loader-utils")

const utils = require("./utils")
const { loadStylus } = require("./style/stylus")


module.exports = function stylusLoader(content, map, meta) {
    this.cacheable && this.cacheable()

    const resolvePath = utils.pathResolverFromLoader(this)
    const options = loaderUtil.getOptions(this) || {}
    const styl = loadStylus(resolvePath, content, this.resourcePath, options)
    const css = styl.render()
    const assets = styl.assets()

    for (const assetPath in assets) {
        this.emitFile(assets[assetPath], fs.readFileSync(assetPath))
    }

    styl.deps().forEach(this.addDependency)
    return css
}
