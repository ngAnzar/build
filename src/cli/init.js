import path from "path"
import findPackage from "find-package-json"

const args = require("minimist")(process.argv.slice(2))

export function defaultEnv(name, init) {
    if (process.env[name] == null) {
        process.env[name] = init()
    }
}


defaultEnv("anzar_cwd", () => {
    return args.context
        ? path.join(process.cwd(), args.context)
        : process.cwd()
})

defaultEnv("anzar_package_path", () => {
    return path.dirname(findPackage(process.env.anzar_cwd).next().value.__path)
})

defaultEnv("anzar_config_path", () => {
    return path.join(process.cwd(), args.config || "webpack.config.js")
})

defaultEnv("anzar_isServing", () => {
    return args._.indexOf("serve") >= 0
})

defaultEnv("anzar_isHot", () => {
    return !!args.hot
})