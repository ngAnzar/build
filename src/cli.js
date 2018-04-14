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

if (args.context) {
    process.env.anzar_cwd = path.join(process.cwd(), args.context)
} else {
    process.env.anzar_cwd = process.cwd()
}

process.env.anzar_package_path = findPackage(process.env.anzar_cwd).next().value.__path
process.env.anzar_isServing = args._.indexOf("serve") >= 0
process.env.anzar_isHot = !!args.hot

// TODO: maybe set environment variables

require("webpack-cli/bin/webpack")
