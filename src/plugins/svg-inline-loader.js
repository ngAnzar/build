const mxml = require("minify-xml")

module.exports = function (content) {
    this.cacheable && this.cacheable()

    let minified = mxml.minify(content)
    let b64 = Buffer.from(minified).toString("base64")
    let uri = `data:image/svg+xml;charset=utf-8;base64,${b64}`

    return `module.exports=${JSON.stringify(uri)}`
}
