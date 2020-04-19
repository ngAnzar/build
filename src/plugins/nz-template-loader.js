const loaderUtils = require("loader-utils")
const path = require("path")
const NzDependencyRebuild = require("./nz-dependency-rebuild")



function normalizeUrl(url, resourcePath) {
    if (url.charAt(0) !== ".") {
        url = `./${url}`
    }

    return [
        url,
        path.normalize(path.resolve(path.join(path.dirname(resourcePath), url)))
    ]
}


async function replaceTemplate(ctx, source, url, begin, end) {
    return new Promise((resolve, reject) => {
        ctx.loadModule(url, (err, loadedSrc) => {
            if (err) {
                reject(err)
            } else {
                loadedSrc = loadedSrc
                    .replace(/^module.exports\s*=\s*/g, "")
                    .replace(/;$/g, "")
                    .trim()

                resolve(
                    source.substring(0, begin)
                    + `template: ${loadedSrc}`
                    + source.substring(end)
                )
            }
        })
    })
}


async function replaceTemplates(ctx, source) {
    const templateUrlRegex = /templateUrl\s*:\s*(['"`])([^'"`]+)\1/gm

    let match
    while (match = templateUrlRegex.exec(source)) {
        const url = path.normalize(path.resolve(path.join(path.dirname(ctx.resourcePath), match[2])))
        NzDependencyRebuild.registry.add(ctx.resourcePath, url)
        ctx.addDependency(url)
        source = await replaceTemplate(ctx, source, url, match.index, match.index + match[0].length)
    }

    return source
}


module.exports = function (source, sourcemap, meta) {
    this.cacheable && this.cacheable()
    const callback = this.async()

    replaceTemplates(this, source)
        .then(result => {
            callback(null, result, sourcemap, meta)
        })
        .catch(err => {
            callback(err)
        })
}
