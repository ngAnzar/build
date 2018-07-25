import path from "path"

import isPlainObject from "is-plain-object"

import { Merge, WhenMode, Constants, Substitute } from "./behaviors"


export class Config extends Array {
    static coerce(config, isMulti) {
        if (config instanceof Config) {
            return config
        } else if (isPlainObject(config)) {
            return new Config(config, isMulti)

            // if (isMulti) {
            //     for (const k in config) {
            //         if (k !== "whenMode" && k !== "constants") {
            //             result.keys.push(k)
            //             result.push(result._merge({}, config[k]))
            //         } else {
            //             result[k] = config
            //         }
            //     }
            // } else {
            //     result.keys.push(null)
            //     result.push(result._merge({}, config))
            // }
        } else {
            throw new Error("Cannot coerce the given config")
        }
    }

    constructor(cfg, forcedMulti) {
        super()
        Object.defineProperty(this, "keys", {
            value: []
        })

        Object.defineProperty(this, "forcedMulti", {
            value: forcedMulti || false
        })

        Object.defineProperty(this, "behaviors", {
            value: [
                new WhenMode(),
                new Constants(),
                new Merge(),
                new Substitute()
            ]
        })

        this._init(cfg)
    }

    get isMulti() {
        return this.forcedMulti || this.length > 1 || (this.length > 0 && this.keys[0] !== null)
    }

    get(key) {
        let idx = this.keys.indexOf(key)
        if (idx >= 0) {
            return this[idx]
        } else {
            return null
        }
    }

    set(key, value) {
        let idx = this.keys.indexOf(key)
        if (idx >= 0) {
            this[idx] = value
        } else {
            this[this.keys.length] = value
            this.keys.push(key)
        }
    }

    each(cb) {
        for (const i in this.keys) {
            cb(this.keys[i], this[i], i)
        }
    }

    update(cfg) {
        cfg = Config.coerce(cfg, this.isMulti)

        this._merge(cfg)
        this._postProcess()
        // cfg = Config.coerce(cfg, this.isMulti)

        // // let defineUpdaters = this.defineUpdaters.concat(cfg.defineUpdaters)
        // // this.defineUpdaters.length = 0
        // // for (const v of defineUpdaters) {
        // //     this.defineUpdaters.push(v)
        // // }

        // if (this.length === 0) {
        //     cfg.each((k, v) => {
        //         this.keys.push(k)
        //         this.push(this._merge({}, v))
        //     })
        // } else {
        //     if (this.isMulti && !cfg.isMulti) {
        //         throw new Error("Cannot update multi config with single config")
        //     }

        //     let base = {}

        //     if (cfg.isMulti && !this.isMulti) {
        //         base = this[0]
        //         this.length = 0
        //         this.keys.length = 0

        //     }

        //     cfg.each((k, v) => {
        //         let idx = this.keys.indexOf(k)
        //         if (idx === -1) {
        //             this.keys.push(k)
        //             this.push(this._merge(base, v))
        //         } else {
        //             this[idx] = this._merge(this[idx], v)
        //         }
        //     })
        // }

        // this._postProcess()
        // this._updateDefines(cfg)
    }

    setPath(path) {
        Object.defineProperty(this, "path", {
            value: path
        })
        this._updateRelatives()
    }

    // ifMode(mode, overrides) {
    //     overrides = Config.coerce(overrides, this.isMulti)

    //     this.each((k, v, i) => {
    //         if (v.mode === mode) {
    //             let other = overrides.get(k)
    //             if (other) {
    //                 this[i] = this._merge(this[i], other)
    //             }
    //         }
    //     })

    //     this._updateDefines()

    //     return this
    // }

    // define(cb) {
    //     this.defineUpdaters.push(cb)
    //     this._updateDefines()
    //     return this
    // }

    _init(cfg) {
        for (const p of this.behaviors) {
            p.init(this, cfg)
        }
    }

    _merge(other) {
        // return webpackMerge(a, b)
        for (const p of this.behaviors) {
            p.merge(this, other)
        }
    }

    _postProcess() {
        for (const p of this.behaviors) {
            p.postProcess(this)
        }
    }

    _updateRelatives() {
        if (!this.path) {
            return
        }

        const dirname = path.dirname(this.path.replace(/^[\/\\]+|^file:[\/\\]+|[\/\\]+$/, ""))
        const subst = (obj) => {
            if (isPlainObject(obj)) {
                for (let k in obj) {
                    obj[k] = subst(obj[k])
                }
            } else if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    obj[i] = subst(obj[i])
                }
            } else if (typeof obj === "string" && obj.startsWith("relative://")) {
                obj = obj.substr(11).replace(/^[\/\\]+|[\/\\]+$/, "")
                obj = path.join(dirname, obj)
            }
            return obj
        }

        this.each((k, cfg) => {
            subst(cfg)
        })
    }

    // _updateDefines(cfg) {
    //     function replace(defs, inside, cb) {
    //         for (const k in inside) {
    //             let v = inside[k]

    //             if (isPlainObject(v) || Array.isArray(v)) {
    //                 replace(defs, v, cb)
    //             } else {
    //                 let replaced = cb(defs, v)
    //                 if (replaced) {
    //                     inside[k] = replaced
    //                 }
    //             }
    //         }
    //     }

    //     function replaceProxy(defs, inside) {
    //         replace(defs, inside, (defs, value) => {
    //             if (value instanceof DefinesProxy) {
    //                 return defs.object
    //             }
    //         })
    //     }

    //     function replacePlugin(defs, inside) {
    //         replace(defs, inside, (defs, value) => {
    //             if (value instanceof webpack.DefinePlugin && value.__anzar) {
    //                 return defs.plugin
    //             }
    //         })
    //     }

    //     const setConstants = (into, consts) => {
    //         if (consts) {
    //             this.each((k, v, i) => {
    //                 for (const name in consts) {
    //                     let value = consts[name]
    //                     if (typeof value === "function") {
    //                         into.set(name, () => options.substituteAll(value(into, v, k)))
    //                     } else {
    //                         into.set(name, options.substituteAll(value))
    //                     }
    //                 }
    //             })
    //         }
    //     }

    //     // initialize defines
    //     this.each((k, v, i) => {
    //         if (!this.defs[i]) {
    //             let base = defines
    //             if (cfg) {
    //                 let cfgIdx = cfg.keys.indexOf(k)
    //                 if (cfgIdx > -1) {
    //                     base = cfg.defs[cfgIdx] || defines
    //                 }
    //             }
    //             this.defs[i] = new Defines(base)
    //         }
    //         setConstants(this.defs[i], this.constants)
    //         setConstants(this.defs[i], v.constants)
    //         delete v.constants

    //         this.defs[i].updateProxies()
    //         replaceProxy(this.defs[i], this[i])
    //         replacePlugin(this.defs[i], this[i])
    //     })
    // }

    // _updateByMode() {
    //     const update = (cfg, key, updates) => {

    //     }
    // }


    // update(overrides) {
    //     let cfg = this._merge(this, overrides)
    //     for (const k in cfg) {
    //         this[k] = cfg[k]
    //     }
    //     return this
    // }

    // each(cb) {
    //     for (const i in this.keys) {
    //         cb(this.keys[i], this.configs[i])
    //     }
    // }

    // ifMode(mode, overrides) {
    //     throw new Error("Must be ovverride")
    // }

    // postProcess() {
    //     this.each((k, cfg) => {

    //     })
    // }

    // _merge(a, b) {
    //     let cfg = webpackMerge(a, b)
    //     this._substOptions(cfg)
    //     return cfg
    // }

    // _substOptions(cfg) {
    //     for (const k in cfg) {
    //         let v = cfg[k]
    //         if (isPlainObject(v)) {
    //             this._substOptions(v)
    //         } else if (typeof v === "string") {
    //             cfg[k] = options.substitute(v)
    //         }
    //     }
    // }
}
