import { config, environment } from "../../index"

environment.setAll({
    cssVariables: () => true,
    platform: () => "electron"
})

export default config("electron/webpack.config.js", {
    target: "electron-main"
})
