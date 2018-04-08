import { config, environment } from "../../index"

environment.setAll({
    cssVariables: () => false,
    platform: () => "browser"
})

export default config("common/webpack.config.js")
