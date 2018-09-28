const parseUrl = require("url").parse
const path = require("path")
const fs = require("fs")

const webpack = require("webpack")
const loaderUtils = require("loader-utils")
// const sync = require("synchronized-promise")
const deasync = require("deasync")
const nodeResolve = require("resolve")


async function wpResolve(loader, contextPath, request) {
    return new Promise((resolve, reject) => {
        loader.resolve(contextPath, request, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })
    })
}

function wpResolveSync(loader, contextPath, request) {
    let success, error, done = 0

    loader.resolve(contextPath, request, (err, res) => {
        if (err) {
            error = err
            done = 2
        } else {
            success = res
            done = 1
        }
    })

    let to = setTimeout(() => {
        error = "Timeout reached while resolving: " + request
        done = 2
    }, 2 * 1000)

    deasync.loopWhile(() => done === 0)
    clearTimeout(to)

    if (done === 2) {
        if (error) {
            throw new Error(error)
        } else {
            throw new Error("Unexpected error")
        }
    } else if (done === 1) {
        return success
    }

    return null
}


const cache = {}


module.exports = _exports = {
    resolvePathSync(loader, contextPath, request, extensions) {
        let key = path.isAbsolute(request) ? request : `${contextPath}///${request}///${extensions.join("")}`
        if (key in cache) {
            return cache[key]
        } else {
            return cache[key] = _exports._resolvePathSync(loader, contextPath, request, extensions)
        }
    },

    _resolvePathSync(loader, contextPath, request, extensions) {

        // Protocol-relative URI
        if (request.startsWith("//")) {
            return request
        } else {
            const uri = parseUrl(request)
            if (uri.protocol && ["http:", "https:", "ftp:"].indexOf(uri.protocol.toLowerCase()) > -1) {
                return uri.href
            } else {
                try {
                    if (fs.statSync(contextPath).isFile()) {
                        contextPath = path.dirname(contextPath)
                    }
                } catch (e) { }

                if (request.startsWith("~")) {
                    request = request.substr(1)
                }

                // request = loaderUtils.urlToRequest(request, contextPath)
                // console.log(request, loaderUtils.urlToRequest(request, contextPath))

                for (const ext of extensions) {
                    let reqWithExt = request.endsWith(ext) ? request : request + ext

                    try {
                        return wpResolveSync(loader, contextPath, reqWithExt)
                    } catch (e) {
                        if (!reqWithExt.startsWith(".")) {
                            try {
                                return nodeResolve.sync(reqWithExt, { basedir: contextPath, extensions: extensions, preserveSymlinks: false })
                            } catch (ee) {
                                continue
                            }
                        }
                    }
                }

                let isDir = false
                try {
                    isDir = fs.statSync(request).isDirectory()
                } catch (e) { }

                if (isDir) {
                    return _exports.resolvePathSync(loader, contextPath, path.join(request, "index"), extensions)
                }
            }
        }
    },

    extendDataWithDefines(loader, data) {
        if (loader._compilation &&
            loader._compilation.options &&
            loader._compilation.options.plugins) {
            for (let plugin of loader._compilation.options.plugins) {
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
}
