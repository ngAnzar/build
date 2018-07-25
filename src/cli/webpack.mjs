import { Config } from "../config/config"

export class Webpack {
    async loadConfig(path) {
        this.cfg = await import(path)

        if (!(this.cfg instanceof Config)) {
            throw new Error(`Webpack config (${path}) must be export default object as '@anzar/build:Config'`)
        }

        return this.cfg
    }
}
