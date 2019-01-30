import path from "path"
import url from "url"
import fs from "fs"

import resolve from "resolve"

import { Config } from "./config"
import { options } from "../options"


export const WEBPACK_CONFIG = "webpack.config.mjs"


function asUrl(path) {
    return url.format({
        pathname: path,
        protocol: "file:",
        slashes: true
    })
}


let resolvers = [
    async function (name, relativeFrom) {
        const relFrom = relativeFrom ? path.dirname(relativeFrom) : options.project_path

        return new Promise((presolve, reject) => {
            let relImport = path.join(relFrom, name)

            if (!relImport.endsWith(".js") && !relImport.endsWith(".mjs")) {
                relImport += ".mjs"
            }

            fs.stat(relImport, (err, stat) => {
                if (!err && stat) {
                    if (stat.isFile()) {
                        presolve(asUrl(relImport))
                        return
                    }
                } else {
                    reject(null)
                }
            })
        })
    },

    async function (name, relativeFrom) {
        const relFrom = relativeFrom ? path.dirname(relativeFrom) : options.project_path
        const packageFilter = (pkg) => {
            pkg.main = WEBPACK_CONFIG
            return pkg
        }
        return new Promise((presolve, reject) => {
            resolve(name, { basedir: relFrom, packageFilter }, (err2, succ) => {
                if (err2) {
                    reject(err2)
                } else {
                    presolve(asUrl(succ))
                }
            })
        })
    }

    // function (name) {
    //     function find(basedir) {
    //         if (!basedir) {
    //             return null
    //         }

    //         const packageFilter = (pkg) => {
    //             pkg.main = WEBPACK_CONFIG
    //             return pkg
    //         }

    //         try {
    //             return resolve.sync(name, { basedir, packageFilter })
    //         } catch (e) {
    //             try {
    //                 return resolve.sync(path.join(name, WEBPACK_CONFIG), { basedir })
    //             } catch (ee) {
    //                 return null
    //             }
    //         }
    //     }

    //     let resolved = [
    //         find(options.package_path),
    //         find(path.resolve(path.join(__dirname, "..", "..")))
    //     ]

    //     for (let r of resolved) {
    //         if (r) {
    //             let cfg = require(r)
    //             if (cfg.default) {
    //                 return cfg.default
    //             } else {
    //                 return cfg
    //             }
    //         }
    //     }
    // }
]


export async function importConfig(path, relativeFrom) {
    if (typeof path === "string") {
        for (const resolve of resolvers) {
            try {
                var configPath = await resolve(path, relativeFrom)
            } catch (e) {
                if (e) {
                    console.log(e.toString())
                }
                continue
            }

            try {
                var config = await import(configPath)
            } catch (e) {
                throw e
            }

            if (config && config.default) {
                config = await config.default
                config.setPath(configPath)
                return config
            } else {
                throw new Error("Invalid configuration file, use: `export default config(...)`")
            }
        }
        throw new Error(`cannot find '${path}' config`)
    } else {
        throw new Error(`path '${path}' must be string`)
    }
}


async function getConfig(config, relativeFrom) {
    if (typeof config === "string") {
        return importConfig(config, relativeFrom)
    } else {
        return config || {}
    }
}


function factory(isMulti) {
    return async function (base, overrides) {
        let stack = getStack()
        let callerStack = stack[1]
        let callerUri = callerStack.getFileName()
        let configPath = url.parse(callerUri).path.replace(/^[\\\/]+|[\\\/]+$/, "")
        if (process.platform !== "win32") {
            configPath = `/${configPath}`
        }
        let result = new Config(null, isMulti, configPath)
        for (let i = 0, l = arguments.length; i < l; i++) {
            result.update(await getConfig(arguments[i], configPath))
        }
        return result
    }
}


function getStack() {
    let origPrepareStackTrace = Error.prepareStackTrace
    Error.prepareStackTrace = function (_, stack) {
        return stack
    }

    let err = new Error()
    let stack = err.stack
    Error.prepareStackTrace = origPrepareStackTrace
    stack.shift()
    return stack
}


let config = factory(false)
config.multi = factory(true)

export { config }
