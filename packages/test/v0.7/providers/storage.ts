export class LocalStorageMock {
    store = {}

    constructor() {
        this.store = {}
    }

    get length() {
        return Object.keys(this.store).length
    }

    key(i: number) {
        const keys = Object.keys(this.store)
        return keys[i] || null
    }

    clear() {
        this.store = {}
    }

    getItem(key: string) {
        return this.store[key] || null
    }

    setItem(key: string, value: string) {
        this.store[key] = String(value)
    }

    removeItem(key: string) {
        delete this.store[key]
    }
}
