import path from "path"

import { isPlainObject } from "is-plain-object"

import { Merge, WhenMode, Constants, Substitute } from "./behaviors.mjs"


export class Config extends Array {
    static coerce(config, isMulti) {
        if (config instanceof Config) {
            return config
        } else if (isPlainObject(config)) {
            return new Config(config, isMulti)
        } else {
            throw new Error("Cannot coerce the given config")
        }
    }

    constructor(cfg, forcedMulti, path) {
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
        this.setPath(path)
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
    }

    setPath(value) {
        if (value) {
            value = value.replace(/^[\/\\]+|^file:[\/\\]+|[\/\\]+$/, "")
            if (!path.isAbsolute(value)) {
                value = `/${value}`
            }
            value = path.normalize(value)
        }
        Object.defineProperty(this, "path", {
            value: value,
            configurable: true
        })
        this._updateRelatives()
    }

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

        const dirname = path.dirname(this.path)
        const recursion = []
        const subst = (obj) => {
            if (!obj) {
                return obj
            }

            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    obj[i] = subst(obj[i])
                }
            } else if (typeof obj === "string") {
                if (obj.startsWith("relative://")) {
                    obj = obj.substr(11).replace(/^[\/\\]+|[\/\\]+$/, "")
                    obj = path.join(dirname, obj)
                }
            } else if (recursion.indexOf(obj) === -1) {
                recursion.push(obj)
                for (let k in obj) {
                    obj[k] = subst(obj[k])
                }
                recursion.pop()
            }
            return obj
        }

        this.each((k, cfg) => {
            subst(cfg)
        })
    }
}
