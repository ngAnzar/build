import path from "path"


export function root(location) {
    return path.resolve(__dirname, "..", location)
}
