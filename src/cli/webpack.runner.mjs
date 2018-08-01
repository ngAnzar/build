import path from "path"
import webpack from "webpack"
import devServer from "webpack-serve"
import supportsColor from "supports-color"

import { Config } from "../config/config"
import { AbstractRunner } from "./abstract.runner"


export class WebpackRunner extends AbstractRunner {
    async run(args) {
        let promises = []
        this.app.config.each((key, config) => {
            if (args.subcommand === "serve" && config.devServer) {
                promises.push(this.serve(args, key, config))
            } else {
                promises.push(this.compile(args, key, config))
            }
        })

        return Promise.all(promises)
    }

    async serve(args, key, config) {
        let server = {
            host: config.devServer.host || "localhost",
            port: config.devServer.port,
            // https: config.devServer.https,
            // http2: config.devServer.http2,
            hotClient: {
                // allEntries: true,
                host: config.devServer.host,
                logLevel: "error"
                // https: config.devServer.https
            },
            content: config.devServer.contentBase
        }

        return devServer(server, { config })
    }

    async compile(args, key, config) {
        return new Promise((resolve, reject) => {
            let compiler = webpack(config)
            let silent = false
            let outputOptions = {
                color: supportsColor.stdout,
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

            let progress = new webpack.ProgressPlugin()
            progress.apply(compiler)

            let compilerCallback = (err, stats) => {
                if (err) {
                    if (err.details && !silent) {
                        console.error(err.details)
                    }

                    if (!args.watch) {
                        reject()
                    }
                } else if (!silent) {
                    process.stdout.write(stats.toString(outputOptions))

                    if (args.watch) {
                        console.log("\nWebpack watching changes ...")
                    }
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