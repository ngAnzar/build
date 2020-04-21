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


function isDir(fs, f) {
    try {
        return fs.statSync(f).isDir()
    } catch (e) {
        return false
    }
}

function isFile(fs, f) {
    try {
        return fs.statSync(f).isFile()
    } catch (e) {
        return false
    }
}


const cache = {}


module.exports = _exports = {
    pathResolver(fs, alias) {
        return (contextPath, request, extensions) => {
            return this.resolvePathSync(fs, alias, contextPath, request, extensions)
        }
    },

    pathResolverFromLoader(loader) {
        let alias = {}
        try {
            alias = loader._compilation.compiler.options.resolve.alias
        } catch (e) { }
        return this.pathResolver(loader.fs, alias)
    },

    resolvePathSyncFromLoader(loader, contextPath, request, extensions) {
        let alias = {}
        try {
            alias = loader._compilation.compiler.options.resolve.alias
        } catch (e) { }
        return this.resolvePathSync(loader.fs, alias, contextPath, request, extensions)
    },

    resolvePathSync(fs, alias, contextPath, request, extensions) {
        let key = path.isAbsolute(request) ? request : `${contextPath}///${request}///${extensions.join("")}`
        if (key in cache) {
            return cache[key]
        } else {
            return cache[key] = _exports._resolvePathSync(fs, alias, contextPath, request, extensions, false)
        }
    },

    _resolvePathSync(fs, alias, contextPath, request, extensions, skipDir) {
        // Protocol-relative URI
        if (request.startsWith("//")) {
            return request
        } else {
            const uri = parseUrl(request)
            if (uri.protocol && ["http:", "https:", "ftp:"].indexOf(uri.protocol.toLowerCase()) > -1) {
                return uri.href
            } else {
                if (isFile(fs, contextPath)) {
                    contextPath = path.dirname(contextPath)
                }

                if (request.startsWith("~")) {
                    request = request.substr(1)
                }

                if (request.startsWith(".")) {
                    request = path.normalize(path.join(contextPath, request))
                }

                if (!skipDir && isDir(fs, request)) {
                    return _exports._resolvePathSync(fs, alias, contextPath, path.join(request, "index"), extensions, true)
                }

                for (let k in alias) {
                    if (request.startsWith(k)) {
                        request = alias[k] + request.substr(k.length)
                        break
                    }
                }

                // let paths = _exports.getNodeModulesUp(contextPath).concat(modules)
                // console.log(contextPath, request, paths)

                let resolved = nodeResolve.sync(request, {
                    basedir: contextPath,
                    extensions: extensions,
                    preserveSymlinks: false,
                    // paths: paths
                })

                if (!skipDir && isDir(fs, resolved)) {
                    return _exports._resolvePathSync(fs, alias, contextPath, path.join(request, "index"), extensions, true)
                }

                return resolved
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
    },

    getNodeModulesUp: function (start) {
        let dir = start
        let root = path.dirname(dir)
        let result = []

        while (root !== dir) {
            root = dir
            let nodeModules = path.join(dir, "node_modules")
            if (fs.existsSync(nodeModules)) {
                result.push(nodeModules)
            }
            dir = path.dirname(dir)
        }

        return result
    }
}
