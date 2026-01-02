export async function processFile(file) {
    let zip
    try {
        zip = await JSZip.loadAsync(file)
    } catch {
        alert("Invalid .rtm file")
        return null
    }

    const { meta, files } = await extractMetaAndFiles(zip)
    if (!meta) return null

    return { meta, files }
}

export async function extractMetaAndFiles(zip) {
    let meta = null
    const files = []

    for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue

        if (name.toLowerCase().endsWith("meta.json")) {
            try {
                const text = await entry.async("text")
                meta = JSON.parse(text)
            } catch {
                alert("Invalid meta.json")
                return {}
            }
            continue
        }

        const isBinary = /\.(png|jpg|jpeg|gif|webp|mp3|ogg|wav)$/i.test(name)
        const content = await entry.async(isBinary ? "blob" : "text")

        files.push({ name, type: isBinary ? "binary" : "text", content })
    }

    if (!meta) {
        alert("meta.json missing")
        return {}
    }
    if (typeof meta.mapper !== "string" || typeof meta.songName !== "string") {
        alert("meta.json missing required fields")
        return {}
    }

    return { meta, files }
}