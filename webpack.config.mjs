import path from "path"
import fs from "fs"

import webpack from "webpack"
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin"
import DuplicatePackageCheckerPlugin from "duplicate-package-checker-webpack-plugin"
import BundleAnalyzerPlugin from "webpack-bundle-analyzer"
import ngtools from "@ngtools/webpack"
const AngularCompilerPlugin = ngtools.AngularCompilerPlugin

import nzStyle from "./src/plugins/style"
import { options, defines, config } from "./src"
import putils from "./src/plugins/utils"


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
    },
    babel: () => {
        throw new Error("Missing babel config")
    },
    aotEntryModule: () => {
        throw new Error("Missing aotEntryModule config")
    },
    node_modules: () => {
        return putils.getNodeModulesUp(options.project_path)
    },
    out_path: () => {
        return path.join(options.project_path, "dist", options.__MODE__)
    },
    css_selector_no_mangle: /^nz-/i,
    relative_assets: null
})


defines.setAllDefault({
    __ENV__: () => options.__ENV__,
    __HMR__: () => options.__HMR__,
    __AOT__: () => options.__AOT__,
    __DEBUG__: () => options.__DEBUG__,
    __MODE__: () => options.__MODE__,
    __PLATFORM__: () => options.__PLATFORM__
})

// stylus.options.setAllDefault({
//     compress: true
// })

const isDev = options.__MODE__ === "development"
// console.log(resolve.sync("webpack-hot-client/client"))
const cssPlugin = new nzStyle.ExportCssPlugin({ outDir: "css", splitByMedia: true })
nzStyle.setSelectorManglingRule(options.css_selector_no_mangle)
const mainFields = ["esm6", "esm2015", "es2015", "esm5"]

if (isDev) {
    for (let i = 0; i <= mainFields.length; i += 2) {
        if (mainFields[i]) {
            mainFields.splice(i, 0, `f${mainFields[i]}`)
        }
    }
}


// console.log(options)


export default config({
    mode: "[__MODE__]",
    devtool: isDev ? "cheap-module-eval-source-map" : false,
    // devtool: false,

    output: {
        path: options.out_path,
        publicPath: "/",
        filename: "js/[name].bundle.js",
        chunkFilename: "js/[name].chunk.js",
        sourceMapFilename: "[file].map",
        hashDigestLength: 10
    },

    resolve: {
        symlinks: true,
        extensions: [".ts", ".tsx", ".js", ".json", ".css", ".styl", ".stylus"],
        mainFields: [
            ...mainFields,
            options.__PLATFORM__,
            "module",
            "main"
        ],
        modules: [
            path.join(options.project_path, "src")
        ].concat(options.node_modules),
        plugins: [
            new TsConfigPathsPlugin({
                configFile: options.tsconfig
            })
        ],
        alias: {
            // "webpack-hot-client/client": resolve.sync("webpack-hot-client/client")
        }
    },

    resolveLoader: {
        modules: [
            "relative://src/plugins",
            "relative://node_modules"
        ].concat(options.node_modules)
    },

    node: {
        fs: "empty"
    },

    watchOptions: {
        ignored: [/node_modules[\\\/](?!@anzar)/ig]
    },

    optimization: {
        minimize: !isDev,
        concatenateModules: !isDev,
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
                            doctype: "html",
                            data: defines.object,
                            stylus: {
                                compress: true,
                                imports: options.stylusImports
                            }
                        }
                    }
                ]
            },
            {
                test: /\.styl(us)?$/,
                use: [
                    cssPlugin.extract(),
                    { loader: "stylus-loader" }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    cssPlugin.extract()
                ]
            },
            {
                test: /\.svg/,
                use: [
                    "base64-inline-loader"
                ]
            },

            //#region Typescript Loader
            options.__AOT__
                ? {
                    test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
                    use: [
                        { loader: "@ngtools/webpack" },
                        { loader: "angular2-template-loader" }
                    ]
                }
                : {
                    test: /\.tsx?/,
                    use: [
                        {
                            loader: "awesome-typescript-loader",
                            options: {
                                configFileName: options.tsconfig,
                                useBabel: true,
                                babelOptions: options.babel,
                                babelCore: "@babel/core",
                                useCache: true,
                                cacheDirectory: path.join(options.project_path, "dist", "[__MODE__]-cache", "awesome"),
                                ignoreDiagnostics: [2451]
                            }
                        },
                        {
                            loader: "angular2-template-loader"
                        }
                    ]
                },
            //#endregion

            {
                test: /\.m?js$/,
                exclude: /node_modules[\\\/](?!@angular|@anzar|rxjs)/,
                use: {
                    loader: "babel-loader",
                    options: {
                        ...options.babel,
                        cacheDirectory: path.join(options.project_path, "dist", "[__MODE__]-cache", "babel")
                    }
                }
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
        defines.plugin,
        cssPlugin
    ].concat(
        options.__AOT__
            ? [
                new AngularCompilerPlugin({
                    tsConfigPath: options.tsconfig,
                    entryModule: options.aotEntryModule,
                    sourceMap: isDev
                })
            ]
            : []
    ).concat(
        options.analyze
            ? [new BundleAnalyzerPlugin.BundleAnalyzerPlugin({ analyzerMode: "server" })]
            : []
    )
})
