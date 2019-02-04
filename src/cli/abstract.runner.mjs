import { EventEmitter } from "events"


export class AbstractRunner extends EventEmitter {
    constructor() {
        super()
        this.cancelToken = new Promise((resolve) => {
            this.cancel = resolve
        })
    }

    init(app) {
        this.app = app
        this.emit("init")
    }

    name() {
        throw new Error("not implemented")
    }

    async run(app, args) {
        throw new Error("not implemented")
    }

    beforeRun(app, args) { }
    afterRun(app, args) { }
}
