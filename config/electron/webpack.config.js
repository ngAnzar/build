import { options, defines, config } from "../../src"


options.setAll({
    platform: "electron"
})


export default config.multi("common", {
    main: {
        target: "electron-main"
    },

    renderer: {
        target: "electron-renderer"
    }
})