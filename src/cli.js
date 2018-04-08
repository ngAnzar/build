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

// TODO: maybe set environment variables

require("webpack-cli/bin/webpack")
