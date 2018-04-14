import path from "path"
import fs from "fs"

import webpack from "webpack"
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin"

import { options, defines, config } from "./lib"
import { root } from "./lib/helper"


options.setAllDefault({
    __ENV__: () => process.env.NODE_ENV || "develop",
    __HMR__: () => process.env.HMR === "true",
    __AOT__: () => process.env.AOT === "true",
    __DEBUG__: () => process.env.DEBUG === "true" || options.__ENV__ === "develop",
    __MODE__: () => options.__ENV__ === "develop" ? "development" : "production",
    __PLATFORM__: () => {
        throw new Error("__PLATFORM__ option is not set")
    },

    cwd: () => process.cwd(),
    package_path: () => options.cwd,
    tsconfig: () => {
        let tscNames = [`tsconfig.${options.__PLATFORM__}.json`, "tsconfig.json"]
        for (let tsconfig of tscNames) {
            let tscPath = path.join(options.package_path, tsconfig)
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


export default config({
    mode: "[__MODE__]",

    output: {
        path: path.join(options.package_path, "dist", "[__MODE__]"),
        publicPath: "/",
        filename: "[name]-[package.version].bundle.js",
        chunkFilename: "[name].chunk.js",
        hashDigestLength: 10,
        sourceMapFilename: "[file].map"
    },

    resolve: {
        extensions: [".ts", ".js", ".json"],
        modules: [
            path.join(options.package_path, "src"),
            path.join(options.package_path, "node_modules")
        ],
        plugins: [
            new TsConfigPathsPlugin({
                configFile: options.tsconfig
            })
        ]
    },

    resolveLoader: {
        modules: [
            root("src/plugins"),
            root("node_modules"),
            path.join(options.package_path, "node_modules")
        ]
    },

    optimization: {
        splitChunks: {
            cacheGroups: {
                default: false,
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "vendor",
                    chunks: "all"
                }
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
                            pretty: options.__ENV__ === "develop",
                            data: defines.object
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
            path.join(options.cwd, "src")
        ),
        defines.plugin
    ]
})
