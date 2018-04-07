import Config, { environment } from "webpack-config"
import { root } from "../helper"

environment.setAll({
    cssVariables: () => true,
    platform: () => "electron"
})

export default new Config().extend(root("src/build/electron/webpack.config.js")).merge({
    target: "electron-main"
})
