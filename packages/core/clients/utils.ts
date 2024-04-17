export const setPimlicoAsProvider = (urlString: string): string => {
    const url = new URL(urlString)

    const params = url.searchParams

    if (params.has("bundlerProvider")) {
        params.set("bundlerProvider", "PIMLICO")
    } else if (params.has("paymasterProvider")) {
        params.set("paymasterProvider", "PIMLICO")
    } else {
        params.set("provider", "PIMLICO")
    }

    url.search = params.toString()

    return url.toString()
}

export const hasPimlicoAsProvider = (urlString: string): boolean => {
    const url = new URL(urlString)
    console.log("url", url)
    const params = url.searchParams
    const provider =
        params.get("provider") ??
        params.get("bundlerProvider") ??
        params.get("paymasterProvider")
    if (provider === "PIMLICO") return true
    return false
}
