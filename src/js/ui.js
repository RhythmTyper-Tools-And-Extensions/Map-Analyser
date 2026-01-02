import * as dom from './dom.js'
import { calculateAccuracy, calculatePP, calculateStars, getTotalObjects, calculateMaxScore } from './calculations.js'
import { applyModToData } from './modifiers.js'

export function createDifficultyButtons(difficulties, onSelect) {
    dom.diffContainer.innerHTML = ""
    let firstButton = null

    for (const diff of difficulties) {
        const btn = document.createElement("button")
        btn.textContent = diff.name
        btn.className =
            "diff-button px-4 py-2 rounded-lg font-medium transition-all " +
            "bg-white/10 text-white border border-white/30 " +
            "hover:scale-105 active:scale-95"

        btn.onclick = () => {
            document.querySelectorAll(".diff-button").forEach(b => {
                b.classList.remove("bg-green-500")
                b.classList.add("bg-white/10")
            })
            btn.classList.remove("bg-white/10")
            btn.classList.add("bg-green-500")
            onSelect(diff)
        }

        dom.diffContainer.appendChild(btn)
        if (!firstButton) firstButton = btn
    }

    if (firstButton) firstButton.click()
}

export function setResultScreen(meta, files) {
    dom.bgDiv.style.backgroundImage = "none"
    dom.bgDiv.style.backgroundColor = "#000"

    if (meta?.songName) {
        dom.songNameEl.textContent = meta.songName
    }
    if (meta?.artistName) {
        dom.songAuthorEl.textContent = `By ${meta.artistName}`
    }

    if (!meta?.backgroundFiles?.length) {
        console.warn("No background image specified, using black background")
        return
    }

    const bgFileName = meta.backgroundFiles[0]
    const bgFile = files.find(f => f.name === bgFileName && f.type === "binary")

    if (!bgFile || !(bgFile.content instanceof Blob)) {
        console.warn("Background file missing or invalid:", bgFileName)
        return
    }

    try {
        const bgUrl = URL.createObjectURL(bgFile.content)
        dom.bgDiv.style.backgroundImage = `url('${bgUrl}')`
        dom.bgDiv.style.backgroundSize = "cover"
        dom.bgDiv.style.backgroundPosition = "center"
    } catch (err) {
        console.warn("Failed to apply background image, using black:", err)
        dom.bgDiv.style.backgroundImage = "none"
        dom.bgDiv.style.backgroundColor = "#000"
    }
}

export function setChartMapper(meta) {
    if (meta?.mapper) {
        dom.chartMapperEl.textContent = `Mapped by: ${meta.mapper}`
    }
}

export function getStarColor(stars) {
    if (stars < 1) return 'var(--color-gray-400)'
    if (stars < 2) return 'var(--color-green-500)'
    if (stars < 3) return 'var(--color-blue-500)'
    if (stars < 4) return 'var(--color-orange-500)'
    if (stars < 5) return 'var(--color-red-500)'
    if (stars < 6) return 'var(--color-pink-500)'
    if (stars < 7) return 'var(--color-purple-500)'
    if (stars < 8) return 'var(--color-violet-500)'
    if (stars < 9) return 'var(--color-indigo-500)'
    return '#000000'
}

export function updateResults(diffData, currentMod) {
    if (!diffData) return

    const perfect = parseInt(dom.perfectInput.value) || 0
    const good = parseInt(dom.goodInput.value) || 0
    const ok = parseInt(dom.okInput.value) || 0
    const miss = parseInt(dom.missInput.value) || 0

    const totalObjects = getTotalObjects(diffData)
    const accResult = calculateAccuracy(perfect, good, ok, miss, totalObjects)

    dom.totalNotesElement.textContent = accResult.notes
    dom.totalHoldsElement.textContent = accResult.holds
    dom.totalTypingElement.textContent = accResult.typing
    dom.remainingElement.textContent = accResult.remaining
    dom.calculatedAccElement.textContent = accResult.accuracy.toFixed(2) + '%'

    const modifiedData = applyModToData(diffData, currentMod)
    modifiedData.accuracy = accResult.accuracy
    
    const pp = calculatePP(modifiedData)
    dom.ppValue.textContent = Math.round(pp)
}

export function updateStarRating(diffData, currentMod) {
    if (!diffData) {
        dom.starRatingBadge.textContent = '★ 0.00'
        dom.starRatingBadge.className = `inline-flex items-center justify-center py-1 text-xs font-bold text-white`
        dom.starRatingBadge.style.backgroundColor = getStarColor(0)
        dom.starRatingBadge.style.borderRadius = '9999px'
        dom.starRatingBadge.style.paddingLeft = '14px'
        dom.starRatingBadge.style.paddingRight = '14px'
        return
    }

    const modifiedData = applyModToData(diffData, currentMod)
    const stars = calculateStars(modifiedData)

    dom.starRatingBadge.textContent = '★ ' + stars.toFixed(2)
    const bgColor = getStarColor(stars)
    const textColor = stars >= 9 ? '#FBBF24' : '#FFFFFF'
    
    dom.starRatingBadge.className = `inline-flex items-center justify-center py-1 text-xs font-bold`
    dom.starRatingBadge.style.backgroundColor = bgColor
    dom.starRatingBadge.style.color = textColor
    dom.starRatingBadge.style.borderRadius = '9999px'
    dom.starRatingBadge.style.paddingLeft = '14px'
    dom.starRatingBadge.style.paddingRight = '14px'
}

export function clampHits(changedInput, diffData) {
    const p = parseInt(dom.perfectInput.value) || 0
    const g = parseInt(dom.goodInput.value) || 0
    const o = parseInt(dom.okInput.value) || 0
    const m = parseInt(dom.missInput.value) || 0

    const totalHits = p + g + o + m
    let { holds, total } = getTotalObjects(diffData)
    total += holds

    if (totalHits <= total) return

    const excess = totalHits - total
    changedInput.value = Math.max(0, (parseInt(changedInput.value) || 0) - excess)
}