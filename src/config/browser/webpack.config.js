import { config, environment } from "../../index"

environment.setAll({
    cssVariables: () => false,
    platform: () => "browser"
})

export default config("common/webpack.config.js").merge({
    devServer: {
        contentBase: path.join(environment.valueOf("package_path"), "dist", "[env]"),
        port: 9000
    }
})
