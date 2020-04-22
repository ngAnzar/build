import path from "path"
import fs from "fs"

import browserslist from "browserslist"

import webpack from "webpack"
import TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin"
import DuplicatePackageCheckerPlugin from "duplicate-package-checker-webpack-plugin"
import BundleAnalyzerPlugin from "webpack-bundle-analyzer"
import TerserPlugin from "terser-webpack-plugin"
import ngtools from "@ngtools/webpack"
const AngularCompilerPlugin = ngtools.AngularCompilerPlugin

// import nzStyle from "./src/plugins/style__"
import { options, defines, config } from "./src"
import putils from "./src/plugins/utils"
import NzDependencyRebuild from "./src/plugins/nz-dependency-rebuild"
import NzStylePlugin from "./src/plugins/style/plugin"


options.setAllDefault({
    __ENV__: () => process.env.NODE_ENV || "development",
    __HMR__: () => process.env.HMR === "true",
    __AOT__: () => process.env.AOT === "true",
    __DEBUG__: () => process.env.DEBUG === "true" || options.__ENV__ === "development",
    __MODE__: () => options.__ENV__ === "development" ? "development" : "production",
    __PLATFORM__: () => {
        throw new Error("__PLATFORM__ option is not set")
    },
    __VERSION__: () => options.pkg.version,
    tsconfig: () => {
        let tscNames = [`tsconfig.${options.__PLATFORM__}.json`, "tsconfig.json"]
        for (let tsconfig of tscNames) {
            let tscPath = path.join(options.project_path, tsconfig)
            if (fs.existsSync(tscPath)) {
                return tscPath
            }
        }
    },
    pkg: () => {
        let packageJson = path.join(options.project_path, "package.json")
        return JSON.parse(fs.readFileSync(packageJson), { encoding: "utf-8" })
    },
    babel: () => {
        throw new Error("Missing babel config")
    },
    aotConfig: () => {
        throw new Error("Missing aot config")
    },
    node_modules: () => {
        return putils.getNodeModulesUp(options.project_path)
    },
    out_path: () => {
        return path.join(options.project_path, "dist", options.__MODE__)
    },
    browserslist: [
        "> 0.5%",
        "last 1 years",
        "Firefox ESR",
        "not dead",
        "not IE 9-11"
    ],
    css_selector_no_mangle: /^nz-/i,
    relative_assets: null
})


const isDev = options.__MODE__ === "development"


defines.setAllDefault({
    __ENV__: () => options.__ENV__,
    __HMR__: () => options.__HMR__,
    __AOT__: () => options.__AOT__,
    __DEBUG__: () => options.__DEBUG__,
    __MODE__: () => options.__MODE__,
    __PLATFORM__: () => options.__PLATFORM__,
    __VERSION__: () => options.__VERSION__
})

// stylus.options.setAllDefault({
//     compress: true
// })


// console.log(resolve.sync("webpack-hot-client/client"))
// const cssPlugin = new nzStyle.ExportCssPlugin({ outDir: "css", splitByMedia: true })

const cssPlugin = new NzStylePlugin({
    outDir: "css",
    splitByMedia: true,
    skipMangle: options.css_selector_no_mangle
})

if (options.projectStyle) {
    for (const s of options.projectStyle) {
        cssPlugin.addProjectStyle(s)
    }
}

if (options.externalStyle) {
    for (const s of options.externalStyle) {
        cssPlugin.addExternalStyle(s)
    }
}

const mainFields = ["esm6", "esm2015", "es2015", "esm5"]

if (isDev) {
    for (let i = 0; i <= mainFields.length; i += 2) {
        if (mainFields[i]) {
            mainFields.splice(i, 0, `f${mainFields[i]}`)
        }
    }
}


console.log(`Supported browsers: ${browserslist(options.browserslist).join(", ")}`)

export default config({
    mode: "[__MODE__]",
    devtool: isDev ? "cheap-source-map" : false,
    // devtool: false,s

    output: {
        path: options.out_path,
        publicPath: "/",
        filename: isDev ? "js/[name].bundle.js" : "js/[name].bundle.[hash].js",
        chunkFilename: isDev ? "js/[name].chunk.js" : "js/[name].chunk.[hash].js",
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
        // maybe need better regex ...
        // ignored: [/node_modules[\\\/](?!@anzar)/ig]
        ignored: null
    },

    optimization: {
        minimize: options.__ENV__ === "production",
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    ecma: 8,
                    safari10: true,
                    compress: {
                        pure_funcs: ["console.info", "console.debug", "console.warn"],
                        drop_console: true
                    }
                }
            })
        ],
        concatenateModules: options.__ENV__ !== "development",
        // concatenateModules: true,
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

    performance: {
        hints: false
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
                                imports: options.stylusImports,
                                defines: defines.object
                            }
                        }
                    }
                ]
            },
            {
                test: /\.styl(us)?$/,
                use: [
                    cssPlugin.externalStyleLoader(),
                    {
                        loader: "stylus-loader",
                        options: {
                            imports: options.stylusImports,
                            defines: defines.object
                        }
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    cssPlugin.externalStyleLoader()
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
                        { loader: "babel-loader", options: options.babel },
                        { loader: "@ngtools/webpack" }
                    ]
                }
                : {
                    test: /\.tsx?/,
                    use: [
                        // {
                        //     loader: "cache-loader",
                        //     options: {
                        //         cacheDirectory: path.join(options.project_path, "dist", "[__MODE__]-cache", "ts"),
                        //     }
                        // },
                        { loader: "babel-loader", options: options.babel },
                        { loader: "ts-loader" },
                        { loader: "nz-template-loader" }
                    ]
                },
            //#endregion

            {
                test: /\.[mc]?js$/,
                exclude: /node_modules[\\\/](?!@angular|@anzar|rxjs)/,
                use: [
                    {
                        loader: "cache-loader",
                        options: {
                            cacheDirectory: path.join(options.project_path, "dist", "[__MODE__]-cache", "babel"),
                        }
                    },
                    { loader: "babel-loader", options: options.babel }
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
        new NzDependencyRebuild(),
        defines.plugin,
        cssPlugin
    ].concat(
        options.__AOT__
            ? [
                new AngularCompilerPlugin({
                    tsConfigPath: options.tsconfig,
                    basePath: options.project_path,
                    sourceMap: isDev,
                    ...options.aotConfig
                })
            ]
            : []
    ).concat(
        options.analyze
            ? [new BundleAnalyzerPlugin.BundleAnalyzerPlugin({ analyzerMode: "server" })]
            : []
    )
})
