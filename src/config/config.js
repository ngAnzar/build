import webpack from "webpack"
import webpackMerge from "webpack-merge"
import { isPlainObject } from "lodash"

import { options } from "../options"
import { Defines, DefinesProxy, defines } from "../defines"


function substOptions(cfg) {
    for (const k in cfg) {
        let v = cfg[k]
        if (isPlainObject(v)) {
            substOptions(v)
        } else if (typeof v === "string") {
            cfg[k] = options.substitute(v)
        }
    }
}


export class Config extends Array {
    static coerce(config, isMulti) {
        if (config instanceof Config) {
            return config
        } else if (isPlainObject(config)) {
            let result = new Config()

            if (isMulti) {
                for (const k in config) {
                    result.keys.push(k)
                    result.push(result._merge({}, config[k]))
                }
            } else {
                result.keys.push(null)
                result.push(result._merge({}, config))
            }

            return result
        } else {
            throw new Error("Cannot coerce the given config")
        }
    }

    constructor() {
        super()
        Object.defineProperty(this, "keys", {
            value: []
        })

        Object.defineProperty(this, "defs", {
            value: []
        })

        Object.defineProperty(this, "defineUpdaters", {
            value: []
        })
    }

    get isMulti() {
        return this.length > 1 || (this.length > 0 && this.keys[0] !== null)
    }

    get(key) {
        let idx = this.keys.indexOf(key)
        if (idx >= 0) {
            return this[idx]
        } else {
            return null
        }
    }

    each(cb) {
        for (const i in this.keys) {
            cb(this.keys[i], this[i], i)
        }
    }

    update(cfg) {
        cfg = Config.coerce(cfg, this.isMulti)

        let defineUpdaters = this.defineUpdaters.concat(cfg.defineUpdaters)
        this.defineUpdaters.length = 0
        for (const v of defineUpdaters) {
            this.defineUpdaters.push(v)
        }

        if (this.length === 0) {
            cfg.each((k, v) => {
                this.keys.push(k)
                this.push(this._merge({}, v))
            })
        } else {
            if (this.isMulti && !cfg.isMulti) {
                throw new Error("Cannot update multi config with single config")
            }

            let base = {}

            if (cfg.isMulti && !this.isMulti) {
                base = this[0]
                this.length = 0
                this.keys.length = 0

            }

            cfg.each((k, v) => {
                let idx = this.keys.indexOf(k)
                if (idx === -1) {
                    this.keys.push(k)
                    this.push(this._merge(base, v))
                } else {
                    this[idx] = this._merge(this[idx], v)
                }
            })
        }

        this._updateDefines(cfg)
    }

    ifMode(mode, overrides) {
        overrides = Config.coerce(overrides, this.isMulti)

        this.each((k, v, i) => {
            if (v.mode === mode) {
                let other = overrides.get(k)
                if (other) {
                    this[i] = this._merge(this[i], other)
                }
            }
        })

        this._updateDefines()

        return this
    }

    define(cb) {
        this.defineUpdaters.push(cb)
        this._updateDefines()
        return this
    }

    _merge(a, b) {
        let result = webpackMerge(a, b)
        substOptions(result)
        return result
    }

    _updateDefines(cfg) {
        function replace(defs, inside, cb) {
            for (const k in inside) {
                let v = inside[k]

                if (isPlainObject(v) || Array.isArray(v)) {
                    replace(defs, v, cb)
                } else {
                    let replaced = cb(defs, v)
                    if (replaced) {
                        inside[k] = replaced
                    }
                }
            }
        }

        function replaceProxy(defs, inside) {
            replace(defs, inside, (defs, value) => {
                if (value instanceof DefinesProxy) {
                    return defs.object
                }
            })
        }

        function replacePlugin(defs, inside) {
            replace(defs, inside, (defs, value) => {
                if (value instanceof webpack.DefinePlugin && value.__anzar) {
                    return defs.plugin
                }
            })
        }

        this.each((k, v, i) => {
            if (!this.defs[i]) {
                let base = defines
                if (cfg) {
                    let cfgIdx = cfg.keys.indexOf(k)
                    if (cfgIdx > -1) {
                        base = cfg.defs[cfgIdx] || defines
                    }
                }
                this.defs[i] = new Defines(base)
            }

            for (const updater of this.defineUpdaters) {
                updater(this.defs[i], v, k)
            }

            this.defs[i].updateProxies()
            replaceProxy(this.defs[i], this[i])
            replacePlugin(this.defs[i], this[i])
        })
    }


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
