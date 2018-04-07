import Config, { environment } from "webpack-config"
import { root } from "../helper"

environment.setAll({
    cssVariables: () => false,
    platform: () => "browser"
})

export default new Config().extend(root("src/build/common/webpack.config.js"))
