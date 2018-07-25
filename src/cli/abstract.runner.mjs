


export class AbstractRunner {
    constructor() {
        this.cancelToken = new Promise((resolve) => {
            this.cancel = () => resolve()
        })
    }

    init(app) {
        this.app = app
    }

    async run(cancel) {
        throw new Error("not implemented")
    }
}
