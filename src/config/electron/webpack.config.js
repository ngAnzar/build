import { config, environment } from "../../index"

environment.setAll({
    cssVariables: () => true,
    platform: () => "electron"
})

export default config("common/webpack.config.js")
