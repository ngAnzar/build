const parseUrl = require("url").parse
const path = require("path")
const fs = require("fs")

const webpack = require("webpack")
const loaderUtils = require("loader-utils")
const sync = require("synchronized-promise")


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


module.exports = exports = {
    async resolvePath(loader, contextPath, request, extensions) {
        return new Promise(async (resolve, reject) => {
            // Protocol-relative URI
            if (request.startsWith("//")) {
                resolve(request)
                return
            } else {
                const uri = parseUrl(request)
                if (uri.protocol && ["http:", "https:", "ftp:"].indexOf(uri.protocol.toLowerCase()) > -1) {
                    resolve(uri.href)
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
                    // console.log(request)

                    let resolved
                    for (const ext of extensions) {
                        let reqWithExt = request.endsWith(ext) ? request : request + ext

                        try {
                            resolved = await wpResolve(loader, contextPath, reqWithExt)
                        } catch (e) {
                            continue
                        }

                        resolve(resolved)
                        return
                    }

                    try {
                        if (fs.statSync(request).isDirectory()) {
                            exports.resolvePath(loader, contextPath, path.join(request, "index"), extensions)
                                .then(resolve)
                                .catch(() => {
                                    reject(`Cannot load '${request}' from '${contextPath}'`)
                                })
                            return
                        }
                    } catch (e) { }
                }

                reject(`Cannot load '${request}' from '${contextPath}'`)
            }
        })
    },

    resolvePathSync(loader, contextPath, request, extensions) {
        return sync(exports.resolvePath)(loader, contextPath, request, extensions)
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
