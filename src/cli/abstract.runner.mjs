


export class AbstractRunner {
    constructor() {
        this.cancelToken = new Promise((resolve) => {
            this.cancel = () => resolve()
        })
    }

    init(app) {
        this.app = app
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
