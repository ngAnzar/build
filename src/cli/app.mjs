import path from "path"
import argparse from "argparse"

import { importConfig } from "../config"


export class Application {
    constructor(name) {
        this.args = new argparse.ArgumentParser({
            prog: name
        })
        this.runners = []
        this.config = null

        this._initArgs()
    }

    async run() {
        const args = this.args.parseArgs()
        const configPath = path.join(args.project, args.config)
        this.config = await importConfig(configPath)
        console.log(this.config)

        let promises = []

        for (const runner of this.runners) {
            promises.push(runner.run(args))
        }

        return Promise.all(promises)
    }

    addRunner(runner) {
        this.runners.push(runner)
    }

    _initArgs() {
        this.args.addArgument(
            ["-p", "--project"],
            {
                defaultValue: process.cwd(),
                help: "project path (default: cwd)"
            }
        )

        this.args.addArgument(
            ["-c", "--config"],
            {
                defaultValue: "webpack.config.mjs",
                help: "config file location (default: [project]/webpack.config.mjs)"
            }
        )

        this.args.addArgument(
            ["-j", "--package"],
            {
                defaultValue: "package.json",
                help: "package.json file location (default: [project]/package.json)"
            }
        )

        for (const runner of this.runners) {
            runner.init(this)
        }
    }
}



const app = new Application("anzar-browser")
// app.addRunner(new WebpackRunner())
// app.addRunner(new ElectronRunner())
app.run()
