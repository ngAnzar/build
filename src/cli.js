#!/usr/bin/env node

require("babel-register")({
    cache: true,
    ignore: function (filename) {
        if (/@anzar\/build\//.test(filename)) {
            return false
        }
        return /node_modules/.test(filename)
    }
})

const path = require("path")
const environment = require("./index").environment

const args = require("minimist")(process.argv.slice(2))

if (args.context) {
    environment.set("cwd", path.join(process.cwd(), args.context))
} else if (args.config) {
    environment.set("cwd", path.join(process.cwd(), path.dirname(args.config)))
} else {
    environment.set("cwd", process.cwd())
}

// TODO: maybe set environment variables

require("webpack-cli/bin/webpack")
