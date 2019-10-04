import path from "path"
import webpack from "webpack"
// import devServer from "webpack-serve"
import Server from "webpack-dev-server"
import createDomain from "webpack-dev-server/lib/utils/createDomain"
import createLogger from "webpack-dev-server/lib/utils/createLogger"
import wdsStatus from "webpack-dev-server/lib/utils/status"
import supportsColor from "supports-color"

import { Config } from "../config/config"
import { AbstractRunner } from "./abstract.runner"


export class WebpackRunner extends AbstractRunner {
    name() {
        return "webpack"
    }

    async run(app, args) {
        let promises = []
        this.app.config.each((key, config) => {
            if (args.subcommand === "serve" && config.devServer) {
                promises.push(this.serve(args, key, config))
            } else {
                delete config.devServer
                args.watch = args.subcommand === "serve"
                promises.push(this.compile(args, key, config))
            }
        })

        return Promise.all(promises)
    }

    async serve(args, key, config) {
        return new Promise((resolve, reject) => {
            const dvs = config.devServer || {}
            let options = {
                historyApiFallback: "historyApiFallback" in dvs ? dvs.historyApiFallback : true,
                host: dvs.host || "localhost",
                port: dvs.port,
                hot: true,
                progress: false,
                // noInfo: true
                quiet: true
            }

            const compiler = webpack(config)
            const log = createLogger({ ...options, quiet: false })
            const server = new Server(compiler, options)

            const httpServer = server.listen(options.port, options.host, (err) => {
                if (err) {
                    throw err
                }

                const uri = createDomain(options, server.listeningApp)
                wdsStatus(uri, options, log, true)
            })

            httpServer.on("close", () => { resolve() })
            httpServer.on("error", () => { reject() })
        })

        // let server = {
        //     host: config.devServer.host || "localhost",
        //     port: config.devServer.port,
        //     // https: config.devServer.https,
        //     // http2: config.devServer.http2,
        //     hotClient: {
        //         // allEntries: true,
        //         host: config.devServer.host,
        //         logLevel: "error",
        //         autoConfigure: true
        //         // https: config.devServer.https
        //     },
        //     content: config.devServer.contentBase
        // }

        // return devServer(server, { config })
    }

    async compile(args, key, config) {
        return new Promise((resolve, reject) => {
            let compiler = webpack(config)
            let silent = false
            let outputOptions = {
                color: true,
                cached: false,
                cachedAssets: false,
                // modules: true,
                // chunks: true,
                // chunkModules: true,
                // entrypoints: true,
                // reasons: true,
                depth: true,
                // usedExports: true,
                // providedExports: true,
                errorDetails: true,
                // chunkOrigins: true
            }

            // if (!silent) {
            //     compiler.hooks.beforeCompile.tap("WebpackInfo", compilation => {
            //         console.log("\nCompilation starting...\n")
            //     })
            //     compiler.hooks.afterCompile.tap("WebpackInfo", compilation => {
            //         console.log("\nCompilation finished\n")
            //     })
            // }

            let compilerCallback = (err, stats) => {
                if (err) {
                    if (err.details && !silent) {
                        console.error(err.details)
                    }

                    if (!args.watch) {
                        reject()
                        return
                    }
                } else if (!silent) {
                    // process.stdout.write(stats.toString(outputOptions))

                    if (args.watch) {
                        console.log("\nWebpack watching changes ...")
                    } else {
                        resolve()
                    }
                    this.emit("compiled")
                }
            }

            if (args.watch) {
                compiler.watch({}, compilerCallback)
            } else {
                compiler.run(compilerCallback)
            }
        })


        // if (compiler instanceof webpack.Compiler.Watching) {
        //     console.log("watching...")
        // } else {
        //     console.log("NOT watching...")
        // }

    }
}
