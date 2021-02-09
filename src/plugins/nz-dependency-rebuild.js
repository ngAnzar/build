const fs = require("fs")
const path = require("path")


class Registry {
    constructor() {
        this.deps = {}
        this.reverse = {}
    }

    add(resource, dependency) {
        if (resource in this.deps) {
            this.deps[resource].add(dependency)
        } else {
            this.deps[resource] = new Set([dependency])
        }

        if (dependency in this.reverse) {
            this.reverse[dependency].add(resource)
        } else {
            this.reverse[dependency] = new Set([resource])
        }
    }

    dependencies() {
        let result = new Set()
        for (const k in this.deps) {
            for (const d of this.deps[k]) {
                result.add(d)
            }
        }
        return result
    }

    resources(dependency) {
        if (dependency in this.reverse) {
            return this.reverse[dependency]
        } else {
            return new Set()
        }
    }
}


class NzDependencyRebuild {
    constructor() {
        this.startTime = Date.now()
        this.prevTimestamps = new Map()
    }

    apply(compiler) {
        compiler.hooks.afterEmit.tapAsync("NzDependencyRebuild", (compilation, callback) => {
            const registry = NzDependencyRebuild.registry

            const deps = registry.dependencies()
            for (const rd of deps) {
                compilation.fileDependencies.add(rd)
                // compilation.contextDependencies.add(path.dirname(rd))
            }

            callback()
        })

        compiler.hooks.watchRun.tap("NzDependencyRebuild", (watch) => {
            const mtime = new Date()
            watch.hooks.compilation.tap("NzDependencyRebuild", (compilation) => {
                try {
                    const registry = NzDependencyRebuild.registry
                    const files = new Set([...Object.keys(registry.deps), ...Object.keys(registry.reverse)])

                    // console.log(files)


                    compilation.fileSystemInfo.createSnapshot(mtime, files, null, null, null, (err, res) => {
                        if (err) {
                            console.error(err)
                            throw err;
                        } else {
                            const fileTimestamps = !res.fileTimestamps
                                ? new Map()
                                : Array.from(res.fileTimestamps.keys())
                                    .reduce((map, key) => {
                                        map.set(key, res.fileTimestamps.get(key).safeTime)
                                        return map
                                    }, new Map())

                            const changes = Array.from(fileTimestamps.keys())
                                .filter(v => (this.prevTimestamps.get(v) || this.startTime) < fileTimestamps.get(v))

                            const removeCached = changes.filter(v => !!registry.reverse[v])

                            const resources = changes.map(v => registry.resources(v))
                                .filter(v => v.size > 0)
                                .flatMap(v => Array.from(v))
                                .filter(v => changes.indexOf(v) === -1)
                                .filter((v, i, a) => a.indexOf(v) === i)

                            for (const changed of removeCached) {
                                for (const cacheKey in compilation.cache) {
                                    const module = compilation.cache[cacheKey]
                                    if (module.resource === changed) {
                                        delete compilation.cache[cacheKey]
                                    }
                                }
                            }

                            for (const resource of resources) {
                                for (const cacheKey in compilation.cache) {
                                    const module = compilation.cache[cacheKey]
                                    if (module.resource === resource) {
                                        fs.utimesSync(resource, mtime, mtime)
                                        compiler.hooks.invalid.call(resource, new Date())
                                    }
                                }
                            }

                            this.prevTimestamps = fileTimestamps
                        }
                    })
                    // console.log(.fileTimestamps)

                } catch (e) {
                    console.error(e)
                }
            })
        })
    }

    _apply(compiler) {
        compiler.hooks.emit.tapAsync("NzDependencyRebuild", (compilation, callback) => {
            callback()
            return;
            const registry = NzDependencyRebuild.registry

            const changes = Array.from(compilation.fileTimestamps.keys())
                .filter(v => (this.prevTimestamps.get(v) || this.startTime) < (compilation.fileTimestamps.get(v) || Infinity))

            const resources = changes.map(v => registry.resources(v))
                .filter(v => v.size > 0)
                .flatMap(v => Array.from(v))
                .filter((v, i, a) => a.indexOf(v) === i)

            // console.log({ changes, resources })
            // console.log(compilation.cache)

            // for (const changed of changes) {
            //     for (const k in compilation.cache) {
            //         const cached = compilation.cache[k]
            //         if (cached.resource === changed) {
            //             cached.buildInfo.cacheable = false
            //             cached._forceBuild = true
            //             delete cached.buildInfo.snapshot
            //             delete cached._source
            //             // console.log(cached)
            //             // console.log("invalidateBuild", changed)
            //             // console.log("invalidateBuild cached.invalidateBuild", cached.invalidateBuild)
            //             // console.log("invalidateBuild cached.invalidateBuild", cached.originalSource)
            //             // cached.invalidateBuild()
            //             // promises.push(this._rebuild(compilation, cached))
            //         }
            //     }
            //     // for (const module of compilation.modules) {
            //     //     if (module.resource === changed) {
            //     //         console.log("CHANGED", changed)
            //     //     }
            //     // }
            // }

            // console.log("WTF???")

            let promises = []
            for (const rebuild of resources) {
                for (const module of compilation.modules) {
                    // console.log("XXX", changed, module.resource || module)
                    if (module.resource === rebuild) {
                        // console.log("before rebuild", rebuild)
                        promises.push(this._rebuild(compilation, module))
                        // console.log("after rebuild", rebuild)
                    }
                }
            }

            this.prevTimestamps = compilation.fileTimestamps

            if (promises.length > 0) {
                Promise.all(promises).then(() => callback())
            } else {
                callback()
            }
        })

        compiler.hooks.afterEmit.tapAsync("NzDependencyRebuild", (compilation, callback) => {
            const registry = NzDependencyRebuild.registry
            const ds = [compilation.fileDependencies, compilation.contextDependencies]

            console.log(registry.entries)
            console.log(registry.dependencies())

            const deps = registry.dependencies()
            for (const d of ds) {
                for (const rd of deps) {
                    d.add(rd)
                }

            }

            callback()
        })

        compiler.hooks.watchRun.tap("NzDependencyRebuild", (watch) => {
            console.log(compiler.inputFileSystem.purge.toString())


            watch.hooks.emit.tapAsync("NzDependencyRebuild", (compilation, callback) => {
                // watch.hooks.emit.tap("NzDependencyRebuild", (compilation, callback) => {
                const registry = NzDependencyRebuild.registry

                const changes = Array.from(compilation.fileTimestamps.keys())
                    .filter(v => (this.prevTimestamps.get(v) || this.startTime) < (compilation.fileTimestamps.get(v) || Infinity))

                const resources = changes.map(v => registry.resources(v))
                    .filter(v => v.size > 0)
                    .flatMap(v => Array.from(v))
                    .filter((v, i, a) => a.indexOf(v) === i)

                console.log("WATCH", { changes, resources })

                let promises = []
                let deleteCached = changes.concat(resources)

                for (const changed of deleteCached) {
                    for (const k in compilation.cache) {
                        const cached = compilation.cache[k]
                        if (cached.resource === changed) {
                            console.log("DELETE CACHE", changed)
                            delete compilation.cache[k]
                            compiler.hooks.invalid.call(changed, new Date())
                            // promises.push(this._rebuild(compilation, cached))
                        }
                    }
                }

                for (const rebuild of resources) {
                    for (const module of compilation.modules) {
                        // console.log("XXX", changed, module.resource || module)
                        if (module.resource === rebuild) {
                            // compiler.hooks.invalid.call(rebuild, new Date())
                            // console.log("before rebuild", rebuild)
                            // promises.push(this._rebuild(compilation, module))
                            // console.log("after rebuild", rebuild, compilation.hooks.needAdditionalPass.call())


                            const fs = require("fs")
                            fs.utimesSync(rebuild, new Date(), new Date())
                            compiler.hooks.invalid.call(rebuild, new Date())

                            // compiler.watchFileSystem.watcher.emit("change", rebuild, new Date(), "rebuild")
                        }
                    }
                }

                this.prevTimestamps = compilation.fileTimestamps

                if (promises.length > 0) {
                    // compilation.hooks.needAdditionalPass.tap("NzDependencyRebuild", () => {
                    //     return true
                    // })
                    Promise.all(promises).then(() => callback())
                    // Promise.all(promises).then(() => {
                    //     compiler.compile(() => callback())
                    // })
                } else {
                    callback()
                }




                // const changes = Array.from(compilation.fileTimestamps.keys())
                //     .filter(v => (this.prevTimestamps.get(v) || this.startTime) < (compilation.fileTimestamps.get(v) || Infinity))

                // // console.log("WATCH", changes)
                // // console.log(compilation)

                // let promises = []
                // for (const changed of changes) {
                //     for (const k in compilation.cache) {
                //         const cached = compilation.cache[k]
                //         if (cached.resource === changed) {
                //             console.log("CHANGED REBUILD...", changed)
                //             promises.push(this._rebuild(compilation, cached))
                //         }
                //     }
                // }

                // if (promises.length) {
                //     Promise.all(promises).then(_ => callback())
                // } else {
                //     callback()
                // }
            })

            // watch.hooks.done.tapAsync("NzDependencyRebuild", (compilation, callback) => {
            //     if (aaaa) {
            //         console.log("afterEmit, has changes")
            //         compiler.run(callback)
            //         // callback()
            //     } else {
            //         callback()
            //     }
            // })
        })
    }

    async _rebuild(compilation, module) {
        await this.__rebuild(compilation, module)
        if (module.issuer) {
            await this._rebuild(compilation, module.issuer)
        }

    }

    async __rebuild(compilation, module) {
        return new Promise((resolve, reject) => {
            compilation.rebuildModule(module, resolve)
        })
    }
}

NzDependencyRebuild.registry = new Registry()

module.exports = NzDependencyRebuild
