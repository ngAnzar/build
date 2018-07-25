import path from "path"
import argparse from "argparse"

import { importConfig } from "../config"
import { options } from "../options"


export class Application {
    constructor(name, runners) {
        this.args = new argparse.ArgumentParser({
            prog: name
        })
        this.runners = runners
        this.config = null

        this._initArgs()
    }

    async run() {
        const args = this.args.parseArgs()
        const configPath = path.isAbsolute(args.config)
            ? args.config
            : path.join(args.project, args.config)

        options.set("config_path", configPath)
        options.set("project_path", args.project)
        options.set("package_json", path.join(args.project, "package.json"))

        this.config = await importConfig(configPath)
        let promises = []

        for (const runner of this.runners) {
            promises.push(runner.run(args))
        }

        return Promise.all(promises)
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

        this.args.addArgument(
            ["-w", "--watch"],
            {
                defaultValue: false,
                help: "watch file changes"
            }
        )

        for (const runner of this.runners) {
            runner.init(this)
        }
    }
}




