import path from "path"
import argparse from "argparse"
import util from "util"

import { importConfig } from "../config"
import { options } from "../options"


export class Application {
    constructor(name, runners) {
        this.args = new argparse.ArgumentParser({
            prog: name,
            description: "description",
            epilog: "epilog"
        })
        // this.runners = runners
        this.runners = {}
        for (const runner of runners) {
            this.runners[runner.name()] = runner
        }

        this.config = null
        this.running = {}
        this.done = false

        this._initArgs()
    }

    async run() {
        const command = ["serve", "build"].indexOf(process.argv[2]) > -1
            ? process.argv[2]
            : null
        const argv = process.argv.slice(command ? 3 : 2)
        const args = this.args.parseArgs(argv)

        const configPath = path.isAbsolute(args.config)
            ? args.config
            : path.join(args.project, args.config)

        options.set("config_path", configPath)
        options.set("project_path", args.project)
        options.set("package_json", path.join(args.project, "package.json"))
        options.set("analyze", args.analyze)

        this.config = await importConfig(configPath)
        let promises = []

        if (args.dump) {
            process.stdout.write(util.inspect(this.config, { depth: 5, color: true }))
        } else {
            if (!command) {
                this.args.error(`Missing command parameter: ${this.args.prog} {serve,build}`)
            }
            args.subcommand = command
            const runners = Object.keys(this.runners).map(k => this.runners[k])

            for (const runner of runners) {
                runner.beforeRun(this, args)
            }

            for (const runner of runners) {
                const name = runner.name()
                this.running[name] = runner.run(this, args).then((param => {
                    delete this.running[name]
                    return param
                }))
                promises.push(this.running[name])
            }

            for (const runner of runners) {
                runner.afterRun(this, args)
            }
        }

        return Promise.all(promises)
            .then(x => {
                this.done = true
            })
            .catch(err => {
                if (typeof err === "number") {
                    process.exitCode = err
                } else {
                    console.error(err)
                }
            })
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
            ["--analyze"],
            {
                action: "storeTrue",
                defaultValue: false,
                help: "enable or disable webpack-bundle-analyzer"
            }
        )

        // this.args.addArgument(
        //     ["-w", "--watch"],
        //     {
        //         action: "storeTrue",
        //         defaultValue: false,
        //         help: "watch file changes"
        //     }
        // )

        this.args.addArgument(
            ["--dump"],
            {
                action: "storeTrue",
                defaultValue: false,
                help: "dump config"
            }
        )

        for (const k in this.runners) {
            this.runners[k].init(this)
        }

        // const subcommands = this.args.addSubparsers({
        //     title: "subcommands",
        //     dest: "subcommand"
        // })

        // subcommands.addParser("serve")
        // subcommands.addParser("build")
    }

    waitFor(runnerName, eventName) {
        const start = new Date()
        const halfHour = 30 * 60 * 1000

        return new Promise((resolve, reject) => {
            let eventOccured = true
            if (eventName) {
                eventOccured = false
                this.runners[runnerName].on(eventName, () => {
                    if (!eventOccured) {
                        eventOccured = true
                        resolve()
                    }
                })
            }

            let started = false
            const tick = () => {
                if (!started && new Date() - start >= halfHour) {
                    throw new Error(`deadlock found in waitFor ${runnerName}`)
                }

                if (this.running[runnerName]) {
                    started = true
                    setTimeout(tick, 100)
                } else if (this.done) {
                    reject()
                } else if (started) {
                    if (!eventOccured) {
                        resolve()
                    }
                } else if (!this.done) {
                    setTimeout(tick, 100)
                }
            }

            // process.nextTick(tick)
            setTimeout(tick, 100)
        })
    }
}
