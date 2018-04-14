#!/usr/bin/env node
"use strict";

require("babel-register")({
    cache: true,
    ignore: function ignore(filename) {
        var anzar = filename.lastIndexOf("@anzar");
        var node_modules = filename.lastIndexOf("node_modules");

        if (anzar >= 0) {
            if (node_modules < 0) {
                return false;
            } else {
                return anzar < node_modules;
            }
        } else {
            return node_modules !== -1;
        }
    }
});

var path = require("path");
var findPackage = require("find-package-json");
var args = require("minimist")(process.argv.slice(2));

var options = require("./index").options;

if (args.context) {
    options.set("cwd", path.join(process.cwd(), args.context));
} else {
    options.set("cwd", process.cwd());
}

var pckg = findPackage(options.cwd).next().value;
var pckg_json = pckg.__path;

options.setAll({
    package_json: pckg_json,
    package_path: path.dirname(pckg_json),
    package_version: pckg.version,
    isServing: args._.indexOf("serve") >= 0,
    isHot: !!args.hot
});

console.log("CLI", options.data);

// TODO: maybe set environment variables

require("webpack-cli/bin/webpack");