#!/usr/bin/env node

require("babel-register")({
    cache: true,
    ignore: function (filename) {
        if (/@anzar\//.test(filename)) {
            console.log(filename, { ignore: false })
            return false
        }
        console.log(filename, { ignore: !!/node_modules/.test(filename) })
        return !!/node_modules/.test(filename)
    }
})

const path = require("path")
const findPackage = require("find-package-json")
const args = require("minimist")(process.argv.slice(2))

const environment = require("./index").environment

if (args.context) {
    environment.set("cwd", path.join(process.cwd(), args.context))
} else {
    environment.set("cwd", process.cwd())
}

const package = findPackage(environment.valueOf("cwd")).next().value
const package_json = package.__path
environment.set("package_json", package_json)
environment.set("package_path", path.dirname(package_json))
environment.set("package_version", package.version)

// TODO: maybe set environment variables

require("webpack-cli/bin/webpack")
