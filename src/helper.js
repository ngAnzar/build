import path from "path"
import { environment } from "webpack-config"


export function root(location) {
    return path.resolve(__dirname, "..", "..", location)
}


export function defaultEnv(props) {
    for (let k in props) {
        if (props.hasOwnProperty(k)) {
            if (!environment.get(k)) {
                environment.set(k, props[k])
            }
        }
    }
}
