import path from "path"
import fs from "fs"

import webpack from "webpack"
import Config, { environment } from "webpack-config"
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin"

import { root, defaultEnv } from "../../helper"


defaultEnv({
    env: () => process.env.NODE_ENV || "develop",
    hmr: () => process.env.HMR === "true",
    aot: () => process.env.AOT === "true",
    debug: () => process.env.DEBUG === "true" || environment.valueOf("env") === "develop",
    cwd: () => {
        // TODO: check more cases like no --config, onyl config name etc...
        let re = /webpack.*?--config(?:[=\s]+)(?:(?:(['"])(.*?)\1)|(\S+))/
        let match = environment.valueOf("npm_lifecycle_script").match(re)
        let cfgFile = match[2] || match[3]

        return path.resolve(process.cwd(), path.dirname(cfgFile))
    },
    tsconfig: () => {
        let tscNames = [`tsconfig.${environment.valueOf("platform")}.json`, "tsconfig.json"]
        for (let tsconfig of tscNames) {
            let tscPath = path.join(environment.valueOf("cwd"), tsconfig)
            if (fs.existsSync(tscPath)) {
                return tscPath
            }
        }
        throw new Error("Cannot find tsconfig. Try to naming your config something like this: " + tscNames.join(", "))
    },
})


export default new Config().merge({
    mode: environment.valueOf("env") === "develop" ? "development" : "production",

    output: {
        path: root("dist/[env]"),
        publicPath: "/",
        filename: "[name].bundle.js",
        chunkFilename: "[name].chunk.js",
        hashDigestLength: 10,
        sourceMapFilename: "[file].map"
    },

    resolve: {
        extensions: [".ts", ".js", ".json"],
        modules: [
            path.join(environment.valueOf("cwd"), "src"),
            path.join(environment.valueOf("cwd"), "node_modules")
        ],
        plugins: [
            new TsConfigPathsPlugin({
                configFile: environment.valueOf("tsconfig")
            })
        ]
    },

    resolveLoader: {
        modules: [
            root("src/plugins"),
            root("node_modules")
        ]
    },

    module: {
        rules: [
            {
                test: /\.pug$/,
                use: [
                    {
                        loader: "pug-loader",
                        options: {
                            pretty: environment.valueOf("env") === "develop"
                        }
                    }
                ]
            },
            {
                test: /\.ts$/,
                exclude: [/\.(spec|e2e|aot)\.ts$/],
                use: [
                    // {
                    //     /**
                    //      *  MAKE SURE TO CHAIN VANILLA JS CODE, I.E. TS COMPILATION OUTPUT.
                    //      */
                    //     loader: "ng-router-loader",
                    //     options: {
                    //         loader: "async-require",
                    //         genDir: root("dist/aot"), // TODO:
                    //         aot: environment.valueOf("aot")
                    //     }
                    // },
                    {
                        loader: "ts-loader",
                        options: {
                            transpileOnly: true
                        }
                    },
                    /*{
                        loader: "ngc-webpack",
                        options: {
                            disable: !environment.valueOf("aot"),
                            tsConfig: root("tools/build/tsconfig.webpack.json"),
                        }
                    },*/

                ]
            },
            {
                test: /\.component\.ts$/,
                use: [
                    {
                        loader: "angular2-template-loader"
                    }
                ]
            }
        ]
    },

    plugins: [
        new webpack.ContextReplacementPlugin(
            /angular(\\|\/)core(\\|\/)(@angular|esm5)/,
            path.join(environment.valueOf("cwd"), "src")
        ),
        new webpack.DefinePlugin({
            "__DEBUG__": environment.valueOf("debug"),
            "__HMR__": environment.valueOf("hmr"),
            "__AOT__": environment.valueOf("aot"),
            "__ENV__": JSON.stringify(environment.valueOf("env")),
            "__PLATFORM__": JSON.stringify(environment.valueOf("platform")),
            "__CSS_VARIABLES__": environment.valueOf("cssVariables"),
        })
    ]
})
