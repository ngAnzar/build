import path from "path"
import fs from "fs"

import resolve from "resolve"

import { Config } from "./config"
import { root } from "../helper"
import { options } from "../options"


let resolvers = [
    function (name) {
        let resolved = [
            resolve.sync(name, { basedir: options.package_path }),
            resolve.sync(name, { basedir: path.resolve(path.join(__dirname, "..", "..")) })
        ]

        function isDirectory(p) {
            try {
                return fs.statSync(p).isDirectory()
            } catch (e) {
                return false
            }
        }

        function isFile(p) {
            try {
                return fs.statSync(p).isFile()
            } catch (e) {
                return false
            }
        }

        for (let r of resolved) {
            if (r) {
                if (isDirectory(r)) {
                    r = path.join(r, "webpack.config.js")
                }

                if (isFile(r)) {
                    return require(r)
                }
            }
        }
    }
]


function getBase(base) {
    if (typeof base === "string") {
        for (const resolve of resolvers) {
            let cfg = resolve(base)
            if (cfg) {
                return cfg
            }
        }
        throw new Error(`cannot find '${base}' config`)
    } else {
        return base || {}
    }
}


function factory(isMulti) {
    return function (base, overrides) {
        base = Config.coerce(getBase(base), isMulti)

        let cfg = new Config()
        cfg.update(base)

        if (overrides) {
            cfg.update(overrides)
        }

        return cfg
    }
}


let config = factory(false)
config.multi = factory(true)

export { config }
