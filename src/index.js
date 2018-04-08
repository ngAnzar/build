import fs from "fs"
import path from path
import { Config, environment } from "webpack-config"
import { root } from "./helper"

export { environment }

export function config(filename, overrides) {
    filename = root(path.join("src", "config", filename))

    if (!fs.existsSync(filename)) {
        throw new Error(`The specified config file is not exists: ${filename}`)
    }

    let cfg = new Config().extend(filename)
    if (overrides) {
        return cfg.merge(overrides)
    } else {
        return cfg
    }
}
