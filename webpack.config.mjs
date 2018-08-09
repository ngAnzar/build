import path from "path"
import fs from "fs"

import webpack from "webpack"
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin"
import DuplicatePackageCheckerPlugin from "duplicate-package-checker-webpack-plugin"

import { options, defines, config } from "./src"
import { filterByEntryPoint } from "./src/util"
// import { root } from "./src/helper"

options.setAllDefault({
    __ENV__: () => process.env.NODE_ENV || "development",
    __HMR__: () => process.env.HMR === "true",
    __AOT__: () => process.env.AOT === "true",
    __DEBUG__: () => process.env.DEBUG === "true" || options.__ENV__ === "development",
    __MODE__: () => options.__ENV__ === "development" ? "development" : "production",
    __PLATFORM__: () => {
        throw new Error("__PLATFORM__ option is not set")
    },
    tsconfig: () => {
        let tscNames = [`tsconfig.${options.__PLATFORM__}.json`, "tsconfig.json"]
        for (let tsconfig of tscNames) {
            let tscPath = path.join(options.project_path, tsconfig)
            if (fs.existsSync(tscPath)) {
                return tscPath
            }
        }
        // throw new Error("Cannot find tsconfig. Try to naming your config something like this: " + tscNames.join(", "))
    }
})


defines.setAllDefault({
    __ENV__: () => options.__ENV__,
    __HMR__: () => options.__HMR__,
    __AOT__: () => options.__AOT__,
    __DEBUG__: () => options.__DEBUG__,
    __MODE__: () => options.__MODE__,
    __PLATFORM__: () => options.__PLATFORM__
})


const isDev = options.__MODE__ === "development"


export default config({
    mode: "[__MODE__]",
    devtool: isDev ? "cheap-module-eval-source-map" : false,
    // devtool: false,

    output: {
        path: path.join(options.project_path, "dist", "[__MODE__]"),
        publicPath: "/",
        filename: "js/[name].bundle.js",
        chunkFilename: "js/[name].chunk.js",
        sourceMapFilename: "[file].map",
        hashDigestLength: 10
    },

    resolve: {
        extensions: [".ts", ".tsx", ".js", ".json"],
        mainFields: [
            (isDev ? "f" : "") + "esm6",
            (isDev ? "f" : "") + "esm2015",
            (isDev ? "f" : "") + "esm5",
            options.__PLATFORM__,
            "module",
            "main"
        ],
        modules: [
            path.join(options.project_path, "src"),
            path.join(options.project_path, "node_modules")
        ],
        plugins: [
            new TsConfigPathsPlugin({
                configFile: options.tsconfig
            })
        ],
        alias: {
            "webpack-hot-client/client": "relative://node_modules/webpack-hot-client/client"
        }
    },

    resolveLoader: {
        modules: [
            "relative://src/plugins",
            "relative://node_modules",
            path.join(options.project_path, "node_modules")
        ]
    },

    watchOptions: {
        ignored: /node_modules[\\\/](?!@anzar)/ig
    },

    optimization: {
        minimize: !isDev,
        splitChunks: {
            // maxSize: 2 * 1024 * 1024,
            cacheGroups: {
                default: {
                    reuseExistingChunk: true,
                    priority: -20
                },
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    reuseExistingChunk: true,
                    name: "vendors",
                    chunks: "all",
                    enforce: true,
                    priority: -10
                },
                // polyfills: {
                //     test: filterByEntryPoint("polyfills"),
                //     reuseExistingChunk: true,
                //     name: "polyfills",
                //     chunks: "all",
                //     enforce: true,
                //     priority: 10
                // }
            }
        }
    },

    module: {
        rules: [
            {
                test: /\.pug$/,
                use: [
                    {
                        loader: "pug-loader",
                        options: {
                            pretty: isDev,
                            data: defines.object
                        }
                    }
                ]
            },
            {
                test: /\.tsx?/,
                use: [
                    {
                        loader: "awesome-typescript-loader",
                        options: {
                            configFileName: options.tsconfig,
                            useBabel: true,
                            babelOptions: {
                                babelrc: true
                            },
                            babelCore: "@babel/core",
                            useCache: true,
                            ignoreDiagnostics: [2451]
                        }
                    }
                ]
            },
            {
                test: /\.aaaats$/,
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
                            // transpileOnly: true
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
            /angular(\\|\/)core(\\|\/)(@angular|f?esm5|f?esm2015)/,
            path.join(options.project_path, "src")
        ),
        new DuplicatePackageCheckerPlugin({
            verbose: true
        }),
        defines.plugin
    ]
})
