import webpack from "webpack"
import webpackMerge from "webpack-merge"
import isPlainObject from "is-plain-object"

import { Defines, DefinesProxy, defines } from "../defines"
import { options } from "../options"

export class Behavior {
    init(config, properties) { }

    merge(into, what) { }

    postProcess(cfg) { }
}


export class SpecialProperty extends Behavior {
    constructor(key) {
        super()
        this.key = key
    }

    init(config, properties) {
        if (config[this.key] == null) {
            Object.defineProperty(config, this.key, {
                value: []
            })
        }

        if (properties && properties[this.key] != null) {
            inplaceConcat(config[this.key], this.handleValue(properties[this.key], null))
            delete properties[this.key]
        }

        if (config.isMulti) {
            for (const k in properties) {
                if (properties[k][this.key]) {
                    inplaceConcat(config[this.key], this.handleValue(properties[k][this.key], k))
                    delete properties[k][this.key]
                }
            }
        }
    }

    merge(into, cfg) {
        inplaceConcat(into[this.key], cfg[this.key])
    }

    postProcess(cfg) {
        for (let fn of cfg[this.key]) {
            cfg.each((k, v, i) => {
                fn(cfg, k, v, i)
            })
        }
    }

    handleValue(value, multiKey) {
        throw new Error("Not implemented")
    }
}


export class WhenMode extends SpecialProperty {
    constructor() {
        super("whenMode")
    }

    initStorage(base, k, v, i) {
        if (base) {
            return [].concat(base)
        } else {
            return []
        }
    }

    handleValue(value, multiKey) {
        let result = []
        for (let mode in value) {
            result.push((cfg, k, v, i) => {
                if (v.mode === mode && (!multiKey || multiKey === k)) {
                    cfg[i] = mergeProps(v, value[mode](v, k, i, cfg))
                }
            })
        }
        return result
    }
}


const DEFINES = Symbol("DEFINES")


export class Constants extends SpecialProperty {
    constructor() {
        super("constants")
    }

    merge(into, cfg) {
        super.merge(into, cfg)

        if (into[DEFINES] == null) {
            Object.defineProperty(into, DEFINES, {
                value: []
            })
        }

        for (let i = 0, l = Math.max(into.length, cfg.length); i < l; i++) {
            if (!into[DEFINES][i]) {
                let base = cfg && cfg[DEFINES] && cfg[DEFINES][i] ? cfg[DEFINES][i] : defines
                into[DEFINES][i] = new Defines(base)
            }
        }
    }

    handleValue(value, multiKey) {
        let result = []
        for (let name in value) {
            result.push((cfg, k, v, i) => {
                if (!multiKey || multiKey === k) {
                    cfg[DEFINES][i].set(name, () => {
                        return value[name].call(cfg[DEFINES][i], v, k, i, cfg)
                    })
                }
            })
        }
        return result
    }

    postProcess(cfg) {
        super.postProcess(cfg)

        cfg.each((k, v, i) => {
            if (cfg[DEFINES][i]) {
                cfg[DEFINES][i].updateProxies()
                this._replaceProxy(cfg[DEFINES][i], v)
                this._replacePlugin(cfg[DEFINES][i], v)
            }
        })
    }

    _replace(defs, properties, replacer) {
        for (const k in properties) {
            let v = properties[k]

            if (isPlainObject(v) || Array.isArray(v)) {
                this._replace(defs, v, replacer)
            } else {
                let replaced = replacer(v)
                if (replaced) {
                    properties[k] = replaced
                }
            }
        }
    }

    _replaceProxy(defs, properties) {
        this._replace(defs, properties, (value) => {
            if (value instanceof DefinesProxy) {
                return defs.object
            }
        })
    }

    _replacePlugin(defs, properties) {
        this._replace(defs, properties, (value) => {
            if (value instanceof webpack.DefinePlugin && value.__anzar) {
                return defs.plugin
            }
        })
    }
}


export class Substitute extends Behavior {
    init(cfg) {
        this._do(cfg)
    }

    merge(cfg) {
        this._do(cfg)
    }

    postProcess(cfg) {
        this._do(cfg)
    }

    _do(cfg) {
        cfg.each((k, v, i) => {
            cfg[i] = options.substituteAll(v)
        })
    }
}


export class Merge extends Behavior {
    init(config, properties) {
        if (properties) {
            if (config.isMulti) {
                for (const k of properties) {
                    config.set(k, properties[k])
                }
            } else {
                config.set(null, properties)
            }
        }
    }

    merge(into, cfg) {
        if (!into.isMulti && cfg.isMulti) {
            throw new Exception("Cannot merge multi config into simple config")
        }

        if (into.isMulti) {
            if (!cfg.isMulti) {
                into.each((k, v, i) => {
                    into[i] = mergeProps(v, cfg.get(null))
                })
            } else {
                cfg.each((k, v, i) => {
                    into.set(k, mergeProps(into.get(k) || {}, v))
                })
            }
        } else {
            into.set(null, mergeProps(into.get(null) || {}, cfg.get(null) || {}))
        }
    }
}


function mergeProps(a, b) {
    return webpackMerge.merge(a, b)
}


function inplaceConcat(dst, src) {
    dst.push.apply(dst, src)
}
