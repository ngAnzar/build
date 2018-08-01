

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
