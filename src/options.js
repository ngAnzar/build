import fs from "fs"
import path from "path"

const DATA = Symbol("DATA")
const ENV_VARS = ["cwd", "package_path", "isServing", "isHot"]

export class Options {
    constructor() {
        Object.defineProperty(this, DATA, {
            enumerable: false,
            writable: false,
            configurable: false,
            value: {}
        })

        for (const k of ENV_VARS) {
            let v = process.env[`anzar_${k}`]
            if (v === "true") {
                v = true
            } else if (v === "false") {
                v = false
            }
            this.set(k, v)
        }

        let _package_json = null
        this.set("package", () => {
            if (_package_json === null) {
                _package_json = JSON.parse(fs.readSync(path.join(this.package_path, "package.json")))
            }
            return _package_json
        })

        this.set("___", Math.round(Math.random() * 1000))
    }

    set(key, value) {
        this[DATA][key] = value

        if (!this.hasOwnProperty(key)) {
            Object.defineProperty(this, key, {
                enumerable: true,
                configurable: false,
                get: this.get.bind(this, key, null)
            })
        }

        return this
    }

    setDefault(key, value) {
        if (!this[DATA].hasOwnProperty(key)) {
            this.set(key, value)
        }
    }

    setAll(data) {
        for (const k in data) {
            this.set(k, data[k])
        }
    }

    setAllDefault(data) {
        for (const k in data) {
            this.setDefault(k, data[k])
        }
    }

    get(key, defaultValue) {
        const val = this[DATA][key]
        if (typeof val === "function") {
            return val(this)
        } else if (val == null) {
            return defaultValue == null ? null : defaultValue;
        } else {
            return val
        }
    }

    each(cb) {
        for (const k in this[DATA]) {
            cb(k, this.get(k))
        }
    }

    merge(other) {
        for (const k in other[DATA]) {
            this[DATA][k] = other[DATA][k]
        }
        return this
    }

    get data() {
        let data = {}
        this.each((k, v) => {
            data[k] = v
        })
        return data
    }

    /**
     * Replace all occurance of `[...]` with the registered value.
     * If value is not set, replacement is not performed.
     */
    substitute(templateString) {
        return `${templateString}`.replace(/\[([^\]]+)\]/g, (match, key) => {
            let parts = key.split(/\./)
            let base = this.get(parts.shift(), math)
            if (base === match) {
                return match
            }

            for (const p of parts) {
                base = base[p]
                if (!base) {
                    return match
                }
            }

            return base
        })
    }
}


const options = new Options()
export { options }