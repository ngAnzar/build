#!/usr/bin/env node

require("babel-register")({
    cache: true,
    ignore: function (filename) {
        const anzar = filename.indexOf("@anzar")
        const node_modules = filename.lastIndexOf("node_modules")

        if (anzar >= 0) {
            if (node_modules < 0) {
                console.log(filename, { ignore: false })
                return false
            } else {
                console.log(filename, { ignore: anzar > node_modules })
                return anzar > node_modules;
            }
        } else {
            console.log(filename, { ignore: node_modules !== -1 })
            return node_modules !== -1
        }
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
