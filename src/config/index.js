import path from "path"
import fs from "fs"

import { Config } from "./config"
import { root } from "../helper"
import { options } from "../options"


let resolvers = [
    function(filename) {
        filename = root(filename)
        let stat

        try {
            stat = fs.statSync(filename)
        } catch (e) {
            return null
        }

        if (stat.isFile()) {
            return require(filename)
        } else if (stat.isDirectory()) {
            filename = path.join(filename, "webpack.config.js")
            if (fs.existsSync(filename)) {
                return require(filename)
            }
        }

        return null
    },

    function(filename) {
        if (!path.isAbsolute(filename)) {
            let tmp = path.join(options.project_path, filename)
            if (fs.existsSync(tmp)) {
                filename = tmp
            }
        }

        return require(filename)
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
