import log from "webpack-log"
import chalk from "chalk"
import WebpackBar from "webpackbar"
import WebpackBarUtil from "webpackbar/dist/utils/cli"
import ciInfo from "ci-info"


export function filterByEntryPoint(entryPointName) {
    const testGroups = (groups) => {
        if (groups) {
            for (const group of groups) {
                if (group.name === entryPointName) {
                    return true
                }
            }
        }
        return false
    }

    return (module, chunks) => {
        for (const chunk of chunks) {
            if (chunk.entryModule && testGroups(chunk.entryModule._groups)) {
                return true
            } else if (testGroups(chunk.groupsIterable)) {
                return true
            }
        }

        return false
    }
}


export function fancyOutput(name, color) {
    const logger = log({
        name: "build"
    })
    const tcolor = WebpackBarUtil.colorize(color)
    let lastProgress = null
    let lastFile = null

    return new WebpackBar({
        name: name,
        color: color,
        fancy: fancyOutputEnabled(),
        reporters: ["fancy", "stats"],
        reporter: !fancyOutputEnabled() ? {
            progress({ state }) {
                let currentFile = state.request ? state.request.file : "..."
                if (currentFile && (lastProgress !== state.progress || lastFile !== currentFile)) {
                    lastProgress = state.progress
                    lastFile = currentFile
                    let percent = `${state.progress < 10 ? "  " : state.progress < 100 ? " " : ""}${state.progress}%`
                    let title = tcolor(`[${name} ${percent}]`)
                    let nfo = chalk.gray(currentFile)
                    logger.info(`${title} ${nfo}`)
                }
            }
        } : {}
    })
}

export function fancyOutputEnabled() {
    return !ciInfo.isCI
}
