import path from "path"
import url from "url"

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
    async function (name) {
        const packageFilter = (pkg) => {
            pkg.main = WEBPACK_CONFIG
            return pkg
        }
        return new Promise((presolve, reject) => {
            resolve(name, { basedir: options.package_path, packageFilter }, (err, succ) => {
                if (err) {
                    reject(err)
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


export async function importConfig(path) {
    if (typeof path === "string") {
        for (const resolve of resolvers) {
            try {
                return import(await resolve(path))
            } catch (e) {
                continue
            }
        }
        throw new Error(`cannot find '${path}' config`)
    } else {
        throw new Error(`path '${path}' must be string`)
    }
}


async function getConfig(config) {
    if (typeof config === "string") {
        return importConfig(config)
    } else {
        return config || {}
    }
}


function factory(isMulti) {
    return async function (base, overrides) {
        let result = new Config(null, isMulti)
        for (let i = 0, l = arguments.length; i < l; i++) {
            result.update(await getConfig(arguments[i]))
        }
        return result
    }
}


let config = factory(false)
config.multi = factory(true)

export { config }
