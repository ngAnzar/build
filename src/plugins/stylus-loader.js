const path = require("path")
const fs = require("fs")
const deasync = require("deasync")

const loaderUtil = require("loader-utils")
const stylus = require("stylus")
const stylusNodes = require("stylus/lib/nodes")
const stylusUtils = require("stylus/lib/utils")

const utils = require("./utils")


const LOADER = Symbol("LOADER")
let IMPORT_CACHE = {}


function __importFile(node, file, literal) {
    let importStack = this.importStack
    let block

    if (IMPORT_CACHE[file]) {
        block = IMPORT_CACHE[file]
        importStack.push(file)
    } else {
        block = IMPORT_CACHE[file] = _importFile.call(this, node, file, literal)
    }

    block = block.clone(this.currentBlock)
    block.parent = this.currentBlock
    block.scope = false
    var ret = this.visit(block)
    importStack.pop()
    if (!this.resolveURL || this.resolveURL.nocheck) this.paths.pop()

    return ret
}


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
        importStack.pop()
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

        let fromFile = this.importStack.length ? this.importStack[this.importStack.length - 1] : imported.filename

        // console.log("\t", fromFile, "@@@", importPath.string, this.importStack)

        // if (fromFile === "D:\\Workspace\\Malta\\lib\\anzar\\core\\src\\common.module\\card") {
        //     console.log(imported, importPath)
        // }

        let pathValue
        try {
            pathValue = utils.resolvePathSync(this.loader, fromFile, importPath.string, [".styl", ".css", ".stylus"])
            // console.log("\t\t>>", pathValue ? pathValue : "NOT FOUND")
        } catch (e) {
            throw new Error(`Can't ${nodeName} '${importPath.string}' inside '${fromFile}'`)
        }

        // if (fromFile === "D:\\Workspace\\Malta\\lib\\anzar\\core\\src\\common.module\\card") {
        //     console.log(importPath.string, "->", pathValue)
        // }
        // console.log(importPath.string, "->", pathValue)

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
        let resolved = utils.resolvePathSync(loader, path.dirname(uri.filename), uri.string, [".styl", ".css", ".stylus"])
        return resolved
        // resolve = deasync(loader.resolve.bind(loader))
        // console.log(resolved, "=>", resolve(loader.context, resolved))
        // return resolve(loader.context, resolved)
    }
}


function stylusNodeToString(node, isUrl) {
    const compiler = new stylus.Compiler(node)
    compiler.isURL = isUrl
    return node.nodes.map(compiler.visit.bind(compiler)).join("")
}

const assetsEmitted = {}
function assetUrlResolver(loader, file, urlResolver) {
    const fn = (typeNode, uriNode, options) => {
        const type = stylusNodeToString(typeNode, true)
        const uri = stylusNodeToString(uriNode, true)

        let resolved = utils.resolvePathSync(loader, path.dirname(uriNode.filename), uri, [])
        let outPath = type + "/" + path.basename(resolved)

        if (!assetsEmitted[resolved]) {
            assetsEmitted[resolved] = outPath
            loader.emitFile(outPath, fs.readFileSync(resolved))
        }

        // return stylusNodes.Call("url", "./" + assetsEmitted[resolved])
        // console.log(stylusNodes.Literal(`url("./${assetsEmitted[resolved]}")`))
        return new stylusNodes.Literal(`url("../${assetsEmitted[resolved]}")`)
    }
    fn.raw = true
    return fn
}


function loadStylus(loader, content, path, options) {
    // TODO: global imports

    // console.log("\n### ", path)

    let styl = stylus(content, {
        Evaluator: CustomEvaluator,
        [LOADER]: loader,
        filename: path
    })

    const urlResolver = stylusResolver(loader, path)
    styl.define("url", urlResolver)
    styl.define("asset-url", assetUrlResolver(loader, path, urlResolver))

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
