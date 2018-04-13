
const DATA = Symbol("DATA")

export class Options {
    constructor() {
        Object.defineProperty(this, DATA, {
            enumerable: false,
            writable: false,
            configurable: false,
            value: {}
        })
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
}


const options = new Options()
export { options }


var opt = new Options()
opt.setAll({
    almafa: "constant",
    fn: () => "Function Result"
})

console.log(opt.almafa)
console.log(opt.fn)
console.log(opt.get("almafa"))
console.log(opt.substitute("almafa-[fn].test"))
console.log(opt.substitute("almafa-[non-existent].test"))

console.log(opt.data)
