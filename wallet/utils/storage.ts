export class KernelLocalStorage {
    constructor(private scope: "ZDWALLET") {}

    public getItem(key: string): string | null {
        return localStorage.getItem(this.scopedKey(key))
    }

    public setItem(key: string, value: string): void {
        localStorage.setItem(this.scopedKey(key), value)
    }

    public removeItem(key: string): void {
        localStorage.removeItem(this.scopedKey(key))
    }

    scopedKey(key: string): string {
        return `${this.scope}:${key}`
    }
}
