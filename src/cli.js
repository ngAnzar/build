#!/usr/bin/env node

require("babel-register")({
    cache: true,
    ignore: function (filename) {
        const anzar = filename.lastIndexOf("@anzar")
        const node_modules = filename.lastIndexOf("node_modules")

        if (anzar >= 0) {
            if (node_modules < 0) {
                return false
            } else {
                return anzar < node_modules;
            }
        } else {
            return node_modules !== -1
        }
    }
})

const path = require("path")
const findPackage = require("find-package-json")
const args = require("minimist")(process.argv.slice(2))

const options = require("@anzar/build").options

if (args.context) {
    options.set("cwd", path.join(process.cwd(), args.context))
} else {
    options.set("cwd", process.cwd())
}

const pckg = findPackage(options.cwd).next().value
const pckg_json = pckg.__path

options.setAll({
    package_json: pckg_json,
    package_path: path.dirname(pckg_json),
    package_version: pckg.version,
    isServing: args._.indexOf("serve") >= 0,
    isHot: !!args.hot
})

console.log("CLI", options.data)

// TODO: maybe set environment variables

require("webpack-cli/bin/webpack")
