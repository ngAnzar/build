import webpackMerge from "webpack-merge"
import { isPlainObject, cloneDeep } from "lodash"

import { options } from "./options"
import { defines, DefinesProxy } from "./defines"


function postProcess(cfg) {
    substitute(cfg)

    // TODO: dev server defines

    defines.updateProxies()
}


function substitute(obj) {
    for (const k in obj) {
        let v = obj[k]
        if (typeof v === "string") {
            obj[k] = options.substitute(v)
        } else if (isPlainObject(v)) {
            substitute(v)
        }
    }
    return obj
}


function setHiddenValues(cfg, values) {
    for (const k in values) {
        Object.defineProperty(cfg, k, {
            enumerable: false,
            configurable: true,
            writable: false,
            value: values[k]
        })
    }
}


function getBase(base) {
    if (typeof base === "string") {
        return require(base)
    } else {
        return base || {}
    }
}


export function config(base, overrides) {
    base = getBase(base)

    if (base.__multiple) {
        throw new Error("Cannot extend simple config from muliple")
    }

    let cfg = webpackMerge(base, overrides)

    postProcess(cfg)
    setHiddenValues(cfg, {
        __multiple: null
    })

    return cfg
}


config.multiple = function (base, overrides) {
    base = getBase(base)

    let cfg = {}

    if (overrides) {
        // ha a base nem multiple, akkor arra konvertálja
        if (!base.__multiple) {
            for (const k in overrides) {
                cfg[k] = webpackMerge(base, overrides[k])
            }
        } else {
            cfg = webpackMerge(base.__multiple, overrides)
        }
    } else {
        cfg = webpackMerge({}, base)
    }

    postProcess(cfg)

    let values = Object.values(cfg)

    setHiddenValues(values, {
        __multiple: cfg
    })

    return values
}

