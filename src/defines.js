import webpack from "webpack"

import { Options, options } from "./options"


const PROXY_PLUGIN = Symbol("PROXY_PLUGIN")
const PROXY_OBJECT = Symbol("PROXY_OBJECT")
const PARENT = Symbol("PARENT")
const DATA = Symbol("DATA")


export class DefinesProxy { }


export class Defines extends Options {
    constructor(parent) {
        super()

        Object.defineProperty(this, PROXY_PLUGIN, {
            enumerable: false,
            writable: false,
            configurable: false,
            value: {}
        })

        Object.defineProperty(this, PROXY_OBJECT, {
            enumerable: false,
            writable: false,
            configurable: false,
            value: new DefinesProxy
        })

        Object.defineProperty(this, PARENT, {
            enumerable: false,
            writable: false,
            configurable: false,
            value: parent
        })
    }

    updateProxies(target) {
        target = target == null ? this : target

        if (this[PARENT]) {
            this[PARENT].updateProxies(target)
        }

        let proxyPlugin = target[PROXY_PLUGIN]
        let proxyObject = target[PROXY_OBJECT]

        this.each((k, v) => {
            if (typeof v === "string") {
                proxyPlugin[k] = JSON.stringify(v)
            } else {
                proxyPlugin[k] = v
            }
            proxyObject[k] = v
        })
    }

    merge(other) {
        super.merge(other)
        this.updateProxies()
    }

    get plugin() {
        let plugin = new webpack.DefinePlugin(this[PROXY_PLUGIN])
        plugin.__anzar = true
        return plugin
    }

    get object() {
        return this[PROXY_OBJECT]
    }

    _storage() {
        if (!this[DATA]) {
            this[DATA] = {}
        }
        return this[DATA]
    }
}


const defines = new Defines()
export { defines }
