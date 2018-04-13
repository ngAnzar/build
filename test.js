require("babel-register")
require("./src/options")
// import config from "./src/config"

const util = require("util")

// console.log(util.inspect(process.env, { color: true }))

console.log(util.inspect(require("./config/common/webpack.config"), { depth: null, color: true }))
