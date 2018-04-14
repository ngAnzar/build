import path from "path"
import fs from "fs"

import resolve from "resolve"

import { Config } from "./config"
import { root } from "../helper"
import { options } from "../options"


let resolvers = [
    function (name) {
        function find(basedir) {
            if (!basedir) {
                return null
            }

            try {
                return resolve.sync(name, { basedir })
            } catch (e) {
                try {
                    return resolve.sync(path.join(name, "webpack.config.js"), { basedir })
                } catch (ee) {
                    return null
                }
            }
        }

        let resolved = [
            find(options.package_path),
            find(path.resolve(path.join(__dirname, "..", "..")))
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
                let cfg = require(r)
                if (cfg.default) {
                    return cfg.default
                } else {
                    return cfg
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
