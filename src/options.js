
const OPTIONS = Symbol("OPTIONS")

export class Options {
    constructor() {
        // Object.defineProperty(this, DATA, {
        //     enumerable: false,
        //     writable: false,
        //     configurable: false,
        //     value: {}
        // })

        this.set("___", Math.round(Math.random() * 1000))
    }

    set(key, value) {
        this._storage()[key] = value

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
        if (!this._storage().hasOwnProperty(key)) {
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
        const val = this._storage()[key]
        if (typeof val === "function") {
            return val(this)
        } else if (val == null) {
            return defaultValue == null ? null : defaultValue;
        } else {
            return val
        }
    }

    each(cb) {
        for (const k in this._storage()) {
            cb(k, this.get(k))
        }
    }

    merge(other) {
        for (const k in other[DATA]) {
            this._storage()[k] = other[DATA][k]
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
            return this.get(key, match)
        })
    }

    _storage() {
        if (!global[OPTIONS]) {
            global[OPTIONS] = {}
        }
        return global[OPTIONS]
    }
}


const options = new Options()
export { options }