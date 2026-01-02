import * as dom from './dom.js'

let searchTimeout = null
let currentStatus = "all"

export function initializeSearch(onBeatmapSelect) {
    const indicator = dom.statusIndicator
    
    function moveIndicator(btn) {
        indicator.style.width = btn.offsetWidth - 9 + "px"
        indicator.style.transform = `translateX(${btn.offsetLeft}px)`
    }

    dom.statusButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            currentStatus = btn.dataset.status
            moveIndicator(btn)

            if (dom.searchInput.value.trim()) {
                searchBeatmaps(dom.searchInput.value.trim(), onBeatmapSelect)
            }
        })
    })

    requestAnimationFrame(() => moveIndicator(dom.statusButtons[0]))

    dom.searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout)

        const query = dom.searchInput.value.trim()
        if (!query) {
            dom.resultsContainer.innerHTML = ""
            return
        }

        searchTimeout = setTimeout(() => searchBeatmaps(query, onBeatmapSelect), 300)
    })
}

async function searchBeatmaps(query, onBeatmapSelect) {
    const url =
        `https://us-central1-rhythm-typer.cloudfunctions.net/api/getBeatmaps` +
        `?limit=50&status=${currentStatus}&sortBy=uploaded&showExplicit=true&language=all&search=${encodeURIComponent(query)}`

    let data
    try {
        data = await (await fetch(url)).json()
    } catch {
        return
    }

    dom.resultsContainer.innerHTML = ""

    data.beatmaps.forEach(beatmap => {
        const card = document.createElement("div")
        card.className = "relative rounded-2xl overflow-hidden mb-4"

        const bg = document.createElement("div")
        bg.className = "absolute inset-0 bg-cover bg-center filter brightness-50 transition-all duration-300"
        bg.style.backgroundColor = "rgba(50, 50, 50, 0.7)"

        if (beatmap.backgroundImageUrl) {
            const img = new Image()
            img.src = beatmap.backgroundImageUrl
            img.onload = () => {
                bg.style.backgroundImage = `url('${img.src}')`
            }
        }

        bg.style.filter = "brightness(0.45)"

        const content = document.createElement("div")
        content.className = "relative p-6 text-white"
        content.innerHTML = `
            <div class="font-bold text-lg">${beatmap.songName}</div>
            <div class="text-sm">${beatmap.artistName}</div>
            <div class="text-xs mt-1 mb-2">Status: ${beatmap.status}</div>
        `

        card.append(bg, content)
        dom.resultsContainer.appendChild(card)

        card.addEventListener("click", async () => {
            try {
                const rtmUrl =
                    `https://storage.googleapis.com/rhythm-typer.firebasestorage.app/beatmaps/${beatmap.id}/${beatmap.id}.rtm`

                const blob = await (await fetch(rtmUrl)).blob()

                const file = new File(
                    [blob],
                    `${beatmap.id}.rtm`,
                    { type: "application/octet-stream" }
                )

                dom.searchInput.value = ""
                dom.resultsContainer.innerHTML = ""

                await onBeatmapSelect(file)
            } catch (err) {
                console.error("Failed to load beatmap:", err)
            }
        })
    })
}