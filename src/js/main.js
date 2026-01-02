import * as dom from './dom.js'
import { processFile } from './fileProcessor.js'
import { createDifficultyButtons, setResultScreen, setChartMapper, updateResults, updateStarRating, clampHits } from './ui.js'
import { initializeSearch } from './search.js'

let mapData = null
let selectedDifficulty = null
let currentMod = 'none'

function getParsedDifficultyData() {
    if (!mapData || !selectedDifficulty) return null

    const file = mapData.files.find(
        f => f.name === selectedDifficulty.filename && f.type === "text"
    ) || null

    if (!file) return null

    try {
        return JSON.parse(file.content)
    } catch {
        return null
    }
}

async function handleFileLoad(file) {
    dom.controls.classList.add('hidden')
    dom.results.classList.add('hidden')
    
    const data = await processFile(file)
    if (!data) return

    mapData = data
    dom.controls.classList.remove('hidden')
    dom.results.classList.remove('hidden')

    createDifficultyButtons(mapData.meta.difficulties, (diff) => {
        selectedDifficulty = diff
        const diffData = getParsedDifficultyData()
        updateResults(diffData, currentMod)
        updateStarRating(diffData, currentMod)
    })

    setResultScreen(mapData.meta, mapData.files)
    setChartMapper(mapData.meta)
}

function setMod(mod) {
    currentMod = mod
    
    const buttons = [dom.modNoneBtn, dom.modNCBtn, dom.modHTBtn]
    buttons.forEach(btn => {
        btn.classList.remove('bg-green-500', 'bg-purple-500', 'bg-orange-500')
        btn.classList.add('bg-white/10', 'border', 'border-white/30')
    })
    
    if (mod === 'none') {
        dom.modNoneBtn.classList.remove('bg-white/10', 'border', 'border-white/30')
        dom.modNoneBtn.classList.add('bg-green-500')
    } else if (mod === 'nc') {
        dom.modNCBtn.classList.remove('bg-white/10', 'border', 'border-white/30')
        dom.modNCBtn.classList.add('bg-purple-500')
    } else if (mod === 'ht') {
        dom.modHTBtn.classList.remove('bg-white/10', 'border', 'border-white/30')
        dom.modHTBtn.classList.add('bg-orange-500')
    }

    const diffData = getParsedDifficultyData()
    updateResults(diffData, currentMod)
    updateStarRating(diffData, currentMod)
}

function playAudio() {
    if (!mapData || !mapData.files) return

    const audioFile = mapData.files.find(f => f.name.toLowerCase().startsWith('audio') && f.type === 'binary')
    if (!audioFile) {
        alert("No audio file found")
        return
    }

    if (dom.songAudio.paused) {
        const audioBlob = new Blob([audioFile.content], { type: 'audio/*' })
        const audioUrl = URL.createObjectURL(audioBlob)
        dom.songAudio.src = audioUrl
        dom.songAudio.play()
        document.getElementById('playIcon').classList.add('hidden')
        document.getElementById('pauseIcon').classList.remove('hidden')
    } else {
        dom.songAudio.pause()
        document.getElementById('playIcon').classList.remove('hidden')
        document.getElementById('pauseIcon').classList.add('hidden')
    }
}

dom.fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0]
    if (!file) return
    await handleFileLoad(file)
})

dom.modNoneBtn.addEventListener('click', () => setMod('none'))
dom.modNCBtn.addEventListener('click', () => setMod('nc'))
dom.modHTBtn.addEventListener('click', () => setMod('ht'))

dom.perfectInput.addEventListener('input', () => {
    const diffData = getParsedDifficultyData()
    clampHits(dom.perfectInput, diffData)
    updateResults(diffData, currentMod)
})

dom.goodInput.addEventListener('input', () => {
    const diffData = getParsedDifficultyData()
    clampHits(dom.goodInput, diffData)
    updateResults(diffData, currentMod)
})

dom.okInput.addEventListener('input', () => {
    const diffData = getParsedDifficultyData()
    clampHits(dom.okInput, diffData)
    updateResults(diffData, currentMod)
})

dom.missInput.addEventListener('input', () => {
    const diffData = getParsedDifficultyData()
    clampHits(dom.missInput, diffData)
    updateResults(diffData, currentMod)
})

dom.comboInput.addEventListener('input', () => {
    const diffData = getParsedDifficultyData()
    updateResults(diffData, currentMod)
})

dom.playButton.addEventListener('click', playAudio)

dom.songAudio.addEventListener('ended', () => {
    document.getElementById('playIcon').classList.remove('hidden')
    document.getElementById('pauseIcon').classList.add('hidden')
})

initializeSearch(handleFileLoad)