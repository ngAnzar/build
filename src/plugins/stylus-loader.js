const path = require("path")
const fs = require("fs")

const loaderUtil = require("loader-utils")
const stylus = require("stylus")
const stylusNodes = require("stylus/lib/nodes")
const stylusUtils = require("stylus/lib/utils")

const utils = require("./utils")


const LOADER = Symbol("LOADER")


/**
 * Import `file` and return Block node.
 *
 * @api private
 */
function importFile(node, file, literal) {
    var importStack = this.importStack
        , Parser = require("stylus/lib/parser")
        , stat

    // Handling the `require`
    if (node.once) {
        if (this.requireHistory[file]) return stylusNodes.null
        this.requireHistory[file] = true

        if (literal && !this.includeCSS) {
            return node
        }
    }

    // Avoid overflows from importing the same file over again
    if (~importStack.indexOf(file))
        throw new Error("import loop has been found")

    var str = fs.readFileSync(file, "utf8")

    // shortcut for empty files
    if (!str.trim()) return stylusNodes.null

    // Expose imports
    node.path = file
    node.dirname = path.dirname(file)
    // Store the modified time
    stat = fs.statSync(file)
    node.mtime = stat.mtime
    this.paths.push(node.dirname)

    if (this.options._imports) this.options._imports.push(node.clone())

    // Parse the file
    importStack.push(file)
    stylusNodes.filename = file

    if (literal) {
        literal = new stylusNodes.Literal(str.replace(/\r\n?/g, "\n"))
        literal.lineno = literal.column = 1
        if (!this.resolveURL) return literal
    }

    // parse
    var block = new stylusNodes.Block
        , parser = new Parser(str, stylusUtils.merge({ root: block }, this.options))

    try {
        block = parser.parse()
    } catch (err) {
        var line = parser.lexer.lineno
            , column = parser.lexer.column

        if (literal && this.includeCSS && this.resolveURL) {
            this.warn("ParseError: " + file + ":" + line + ":" + column + ". This file included as-is")
            return literal
        } else {
            err.filename = file
            err.lineno = line
            err.column = column
            err.input = str
            throw err
        }
    }

    // Evaluate imported "root"
    block = block.clone(this.currentBlock)
    block.parent = this.currentBlock
    block.scope = false
    var ret = this.visit(block)
    importStack.pop()
    if (!this.resolveURL || this.resolveURL.nocheck) this.paths.pop()

    return ret
}


class CustomEvaluator extends stylus.Evaluator {
    constructor(root, options) {
        super(root, options)
        this.loader = options[LOADER]
        this.includeCSS = false
    }

    visitImport(imported) {
        this.return++
        const importPath = this.visit(imported.path).first
        this.return--

        if (importPath.name === "url") {
            if (imported.once) {
                throw new Error("You cannot @require a url")
            }

            return imported
        }

        const nodeName = imported.once ? "require" : "import"
        if (!importPath.string) {
            throw new Error(`@${nodeName} string expected`)
        }

        let pathValue = utils
            .resolvePathSync(this.loader, imported.filename, importPath.string, [".styl", ".css", ".stylus"])

        // console.log(importPath.string, "->", pathValue)

        if (!pathValue) {
            throw new Error(`Can't ${nodeName} '${importPath.string}' inside '${imported.filename}'`)
        }

        const literal = /\.css(?:"|$)/.test(pathValue)

        if (nodeName === "import" && literal) {
            return imported
        }

        let block = new stylusNodes.Block

        block.push(importFile.call(this, imported, pathValue, literal))

        return block
    }
}


function stylusResolver(loader, file) {
    return (uri, options) => {
        let compiler = new stylus.Compiler(uri)
        compiler.isURL = true
        uri = uri.stylusNodes.map((node) => compiler.visit(node)).join("")
        console.log("STYLUS", uri)
        return utils.resolvePathSync(loader, path.dirname(file), uri, [".styl", ".css", ".stylus"])
    }
}


function loadStylus(loader, content, path, options) {
    // TODO: global imports

    let styl = stylus(content, {
        Evaluator: CustomEvaluator,
        [LOADER]: loader,
        filename: path
    })

    styl.define("url", stylusResolver(loader, path))

    if (!options) {
        options = {}
    }

    let data = {}
    utils.extendDataWithDefines(loader, data)

    options.define = Object.assign({}, data, options.define || {})

    if (options.define) {
        let define = options.define
        for (let k in define) {
            if (define.hasOwnProperty(k)) {
                styl = styl.define(k, define[k])
            }
        }
    }

    if (options.imports) {
        let old = styl.get("imports") || []
        if (Array.isArray(options.imports)) {
            old = old.concat(options.imports)
        } else {
            old = old.concat([options.imports])
        }
        styl.set("imports", old)
    }

    return styl
}

module.exports = function stylusLoader(content, map, meta) {
    this.cacheable && this.cacheable()

    const options = loaderUtil.getOptions(this) || {}
    const styl = loadStylus(this, content, this.resourcePath, options)
    const css = styl.render()
    styl.deps().forEach(this.addDependency)
    return css
}


module.exports.loadStylus = loadStylus
