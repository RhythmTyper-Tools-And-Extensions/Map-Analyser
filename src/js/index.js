// Containers / Sections
const controls = document.getElementById('controls')
const results = document.getElementById('results')
const diffContainer = document.getElementById('difficultyButtons')
const bgDiv = document.getElementById('background')

// Song Info
const songNameEl = document.getElementById('songName')
const songAuthorEl = document.getElementById('songAuthor')
const chartMapperEl = document.getElementById('chartMapper')
const starRatingBadge = document.getElementById('starRatingBadge')
const ppValue = document.getElementById("ppValue")
const playButton = document.getElementById("playButton")
const songAudio = document.getElementById("songAudio")

// Inputs
const perfectInput = document.getElementById('perfect')
const goodInput = document.getElementById('good')
const okInput = document.getElementById('ok')
const missInput = document.getElementById('miss')
const comboInput = document.getElementById('Combo')

// Mod Buttons
const modNoneBtn = document.getElementById('modNone')
const modNCBtn = document.getElementById('modNC')
const modHTBtn = document.getElementById('modHT')

// Totals / Results
const totalNotesElement = document.getElementById('totalNotes')
const totalHoldsElement = document.getElementById('totalHolds')
const totalTypingElement = document.getElementById('totalTyping')
const remainingElement = document.getElementById('remaining')
const calculatedAccElement = document.getElementById('calculatedAcc')

diffContainer.innerHTML = ""

let mapData = null
let selectedDifficulty = null
let firstButton = null
let currentMod = 'none'

const MOD_MULTIPLIERS = {
    'none': 1.0,
    'nc': 1.12,
    'ht': 0.3
}

async function processFile(file) {
    let zip
    try {
        zip = await JSZip.loadAsync(file)
    } catch {
        alert("Invalid .rtm file")
        return
    }

    const { meta, files } = await extractMetaAndFiles(zip)
    if (!meta) return

    mapData = { meta, files }
    controls.classList.remove('hidden')
    results.classList.remove('hidden')

    createDifficultyButtons(meta.difficulties)
    setResultScreen(meta, files)
    setChartMapper(meta)
    updateResults()
}

async function extractMetaAndFiles(zip) {
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

        const isBinary = /\.(png|jpg|jpeg|gif|mp3|ogg|wav)$/i.test(name)
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

function createDifficultyButtons(difficulties) {
    diffContainer.innerHTML = ""
    firstButton = null
    selectedDifficulty = null

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
            selectedDifficulty = diff
            updateResults(currentMod)
            updateStarRating(currentMod)
        }

        diffContainer.appendChild(btn)
        if (!firstButton) firstButton = btn
    }

    if (firstButton) firstButton.click()
}

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

function getTotalObjects() {
    const diffData = getParsedDifficultyData()
    if (!diffData?.notes) {
        return { notes: 0, holds: 0, typing: 0, total: 0}
    }

    let notes = 0
    let holds = 0
    let typing = diffData.typingSections?.length ?? 0

    for (const note of diffData.notes) {
        if (note.type === "tap") notes++
        else if (note.type === "hold") holds++
    }

    return {
        notes,
        holds,
        typing,
        total: notes + holds + typing
    }
}

function clampHits(changedInput) {
    const p = parseInt(perfectInput.value) || 0
    const g = parseInt(goodInput.value) || 0
    const o = parseInt(okInput.value) || 0
    const m = parseInt(missInput.value) || 0

    const totalHits = p + g + o + m
    let { holds, total } = getTotalObjects()
    total += holds

    if (totalHits <= total) return

    const excess = totalHits - total
    changedInput.value = Math.max(0, (parseInt(changedInput.value) || 0) - excess)
}

function calculateAccuracy() {
    const n300 = parseInt(perfectInput.value) || 0
    const n100 = parseInt(goodInput.value) || 0
    const n50 = parseInt(okInput.value) || 0
    const nmiss = parseInt(missInput.value) || 0

    const totalHits = n300 + n100 + n50 + nmiss
    const { notes, holds, typing, total } = getTotalObjects()
    const remaining = Math.max(0, (total + holds) - totalHits)

    const accuracy = totalHits === 0 
        ? 100 
        : (300 * n300 + 100 * n100 + 50 * n50) / (300 * totalHits) * 100

    totalNotesElement.textContent = notes
    totalHoldsElement.textContent = holds
    totalTypingElement.textContent = typing
    remainingElement.textContent = remaining
    calculatedAccElement.textContent = accuracy.toFixed(2) + '%'

    return { accuracy, misses: nmiss }
}

function calculatePP(scoreData) {
    let convertedNotes = [];
    for (const note of scoreData.notes)
    {
      if (note.type == "hold")
      {
        let convertedNote = 
        { 
          startTime: note.startTime / 1000,
          endTime: note.endTime / 1000,
          type: note.type,
          key: note.key,
        };
        convertedNotes.push(convertedNote);
      }
      if (note.type == "tap")
      {
        let convertedNote = 
        { 
          time: note.time / 1000,
          startTime: note.time / 1000,
          type: note.type,
          key: note.key,
        };
        convertedNotes.push(convertedNote);
      }
      
    }

    const notes = convertedNotes;
    const od = scoreData.overallDifficulty;
    const acc = scoreData.accuracy / 100;
  
    const MIN_DT = 0.04;
    const ALPHA = 0.85;
    const HALF_LIFE = 0.25;
    const TAIL_FRAC = 0.10;
    const PP_PER_UNIT = 10;
    const OD_SLOPE = 0.08;
    const MAX_LEN_NOTES = 500;
    const MAX_LEN_BONUS = 1.25;
  
    const chordBonus = k =>
      1 + 1.6 * (1 - Math.exp(-0.6 * Math.max(0, k - 1)));
  
    const reusePenalty = d =>
      0.55 * Math.exp(-0.7 * (d - 1));
  
    /* build events */
  
    const byTime = {};
    for (const n of notes) {
      (byTime[n.startTime] ??= []).push(n.key);
    }
  
    const times = Object.keys(byTime).map(Number).sort((a, b) => a - b);
  
    const events = times.map(t => {
      const keys = [...new Set(byTime[t])];
      return { t, keys };
    });
  
    /* strain, EMA */
  
    let ema = 0;
    let lastT = times[0];
    const emaVals = [];
    const history = [];
  
    for (const e of events) {
      const dt = Math.max(MIN_DT, e.t - lastT);
      let strain = Math.pow(1 / dt, ALPHA);
  
      let reuse = 0;
      for (let d = 1; d <= history.length; d++) {
        if (e.keys.some(k => history[history.length - d].has(k))) {
          reuse += reusePenalty(d);
        }
      }
  
      strain *= Math.max(0.2, 1 - reuse);
      strain *= chordBonus(e.keys.length);
  
      const decay = Math.pow(0.5, dt / HALF_LIFE);
      ema = ema * decay + strain * (1 - decay);
      emaVals.push(ema);
  
      history.push(new Set(e.keys));
      if (history.length > 6) history.shift();
  
      lastT = e.t;
    }
  
    /* aggregate difficulty */
  
    emaVals.sort((a, b) => b - a);
    const take = Math.max(1, Math.floor(emaVals.length * TAIL_FRAC));
    const core =
      emaVals.slice(0, take).reduce((s, v) => s + v, 0) / take;
  
    /* final scaling */
  
    const x = Math.min(notes.length, MAX_LEN_NOTES);
    const lenBonus =
      1 +
      (MAX_LEN_BONUS - 1) *
        Math.log(1 + x) /
        Math.log(1 + MAX_LEN_NOTES);
  
    const odBonus = 1 + OD_SLOPE * (od - 5);
    const accBonus = Math.pow(acc, 5); 
  
    return core * lenBonus * PP_PER_UNIT * odBonus * accBonus;
}

function calculateMaxScore() {
    const { holds, total } = getTotalObjects()
    const totalNotes = total + holds

    const modMultiplier = MOD_MULTIPLIERS[currentMod] || 1.0
    
    let maxScore = 0
    for (let i = 0; i < totalNotes; i++) {
        maxScore += 300 * (1 + i * 0.001);
    }
    
    maxScore *= modMultiplier

    return { maxScore: Math.round(maxScore) }
}

function updateResults() {
    if (!mapData) return

    const { accuracy } = calculateAccuracy()
    const { maxScore } = calculateMaxScore()

    const diffData = getParsedDifficultyData()
    
    if (currentMod === 'nc') {
        diffData.overallDifficulty = (80 - diffData.overallDifficulty*6) / 1.5
        diffData.overallDifficulty = (diffData.overallDifficulty - 80) / -6
        diffData.notes.forEach(note => {
            if (note.time !== undefined) note.time *= 1.5;
            if (note.startTime !== undefined) note.startTime *= 1.5;
            if (note.endTime !== undefined) note.endTime *= 1.5;
        });
    } else if (currentMod === 'ht') {
        diffData.overallDifficulty = (80 - diffData.overallDifficulty*6) / 0.75
        diffData.overallDifficulty = Math.max((diffData.overallDifficulty - 80) / -6,0)
        diffData.notes.forEach(note => {
            if (note.time !== undefined) note.time /= 0.75;
            if (note.startTime !== undefined) note.startTime /= 0.75;
            if (note.endTime !== undefined) note.endTime /= 0.75;
        });
    }
    
    diffData.accuracy = accuracy;
    const pp = calculatePP(diffData)
    ppValue.textContent = Math.round(pp)
}

function setResultScreen(meta, files) {
    if (!meta.backgroundFiles?.length || !meta.backgroundFiles?.length || !meta?.songName || !meta.artistName ) return

    const bgFile = meta.backgroundFiles[0]
    const bgBlob = files.find(f => f.name === bgFile)?.content
    if (!bgBlob) return

    const bgUrl = URL.createObjectURL(bgBlob)
    bgDiv.style.backgroundImage = `url('${bgUrl}')`
    
    songNameEl.textContent = meta.songName
    songAuthorEl.textContent = `By ${meta.artistName}`
}

function setChartMapper(meta) {
    if (meta?.mapper) chartMapperEl.textContent = `Mapped by: ${meta.mapper}`
}

function getStarColor(stars) {
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

function calculateStars(scoreData) {
    let convertedNotes = [];
    for (const note of scoreData.notes)
    {
      if (note.type == "hold")
      {
        let convertedNote = 
        { 
          startTime: note.startTime / 1000,
          endTime: note.endTime / 1000,
          type: note.type,
          key: note.key,
        };
        convertedNotes.push(convertedNote);
      }
      if (note.type == "tap")
      {
        let convertedNote = 
        { 
          time: note.time / 1000,
          startTime: note.time / 1000,
          type: note.type,
          key: note.key,
        };
        convertedNotes.push(convertedNote);
      }
      
    }

    const notes = convertedNotes;
    const od = scoreData.overallDifficulty;
  
    const MIN_DT = 0.04;
    const ALPHA = 0.85;
    const HALF_LIFE = 0.25;
    const TAIL_FRAC = 0.10;
    const STAR_SCALE = 1.0;
    const OD_SLOPE = 0.08;
    const MAX_LEN_NOTES = 500;
    const MAX_LEN_BONUS = 1.25;
  
    const chordBonus = k =>
      1 + 1.6 * (1 - Math.exp(-0.6 * Math.max(0, k - 1)));
  
    const reusePenalty = d =>
      0.55 * Math.exp(-0.7 * (d - 1));
  
    /* build events */
  
    const byTime = {};
    for (const n of notes) {
      (byTime[n.startTime] ??= []).push(n.key);
  
      if (n.type === 'hold' && n.endTime != null && n.endTime > n.startTime) {
        (byTime[n.endTime] ??= []).push(n.key);
      }
    }
  
    const times = Object.keys(byTime).map(Number).sort((a, b) => a - b);
  
    const events = times.map(t => ({
      t,
      keys: [...new Set(byTime[t])]
    }));
  
    /* strain, EMA */
  
    let ema = 0;
    let lastT = times[0];
    const emaVals = [];
    const history = [];
  
    for (const e of events) {
      const dt = Math.max(MIN_DT, e.t - lastT);
      let strain = Math.pow(1 / dt, ALPHA);
  
      let reuse = 0;
      for (let d = 1; d <= history.length; d++) {
        if (e.keys.some(k => history[history.length - d].has(k))) {
          reuse += reusePenalty(d);
        }
      }
  
      strain *= Math.max(0.2, 1 - reuse);
      strain *= chordBonus(e.keys.length);
  
      const decay = Math.pow(0.5, dt / HALF_LIFE);
      ema = ema * decay + strain * (1 - decay);
      emaVals.push(ema);
  
      history.push(new Set(e.keys));
      if (history.length > 6) history.shift();
  
      lastT = e.t;
    }
  
    /* aggregate difficulty */
    emaVals.sort((a, b) => b - a);
    const take = Math.max(1, Math.floor(emaVals.length * TAIL_FRAC));
    const core =
      emaVals.slice(0, take).reduce((s, v) => s + v, 0) / take;
  
    /* final scaling */
  
    const x = Math.min(events.length, MAX_LEN_NOTES);
    const lenBonus =
      1 +
      (MAX_LEN_BONUS - 1) *
        Math.log(1 + x) /
        Math.log(1 + MAX_LEN_NOTES);
  
    const odBonus = 1 + OD_SLOPE * (od - 5);
    return core * lenBonus * odBonus * STAR_SCALE;
}

function updateStarRating() {
    if (!selectedDifficulty) return

    const diffData = getParsedDifficultyData()
    if (!diffData) {
        starRatingBadge.textContent = '★ 0.00'
        starRatingBadge.className = `inline-flex items-center justify-center py-1 text-xs font-bold text-white`
        starRatingBadge.style.backgroundColor = getStarColor(0)
        starRatingBadge.style.borderRadius = '9999px'
        starRatingBadge.style.paddingLeft = '14px'
        starRatingBadge.style.paddingRight = '14px'
        return
    }

    if (currentMod === 'nc') {
        diffData.overallDifficulty = (80 - diffData.overallDifficulty*6) / 1.5
        diffData.overallDifficulty = (diffData.overallDifficulty - 80) / -6
        diffData.notes.forEach(note => {
            if (note.time !== undefined) note.time /= 1.5;
            if (note.startTime !== undefined) note.startTime /= 1.5;
            if (note.endTime !== undefined) note.endTime /= 1.5;
        });
    } else if (currentMod === 'ht') {
        diffData.overallDifficulty = (80 - diffData.overallDifficulty*6) / 0.75
        diffData.overallDifficulty = Math.max((diffData.overallDifficulty - 80) / -6,0)
        diffData.notes.forEach(note => {
            if (note.time !== undefined) note.time /= 0.75;
            if (note.startTime !== undefined) note.startTime /= 0.75;
            if (note.endTime !== undefined) note.endTime /= 0.75;
        });
    }
    
    let stars = calculateStars(diffData)

    starRatingBadge.textContent = '★ ' + stars.toFixed(2)
    const bgColor = getStarColor(stars)
    const textColor = stars >= 9 ? '#FBBF24' : '#FFFFFF'
    
    starRatingBadge.className = `inline-flex items-center justify-center py-1 text-xs font-bold`
    starRatingBadge.style.backgroundColor = bgColor
    starRatingBadge.style.color = textColor
    starRatingBadge.style.borderRadius = '9999px'
    starRatingBadge.style.paddingLeft = '14px'
    starRatingBadge.style.paddingRight = '14px'
}

document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0]
    if (!file) return

    controls.classList.add('hidden')
    results.classList.add('hidden')
    await processFile(file)
})

const searchInput = document.getElementById("searchInput")
const resultsContainer = document.getElementById("searchResults")

let searchTimeout = null

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout)

    const query = searchInput.value.trim()
    if (!query) {
        resultsContainer.innerHTML = ""
        return
    }

    searchTimeout = setTimeout(() => searchBeatmaps(query), 300)
})

let currentStatus = "all"

const statusButtons = document.querySelectorAll(".status-btn")
const indicator = document.getElementById("statusIndicator")

function moveIndicator(btn) {
    indicator.style.width = btn.offsetWidth - 9 + "px"
    indicator.style.transform = `translateX(${btn.offsetLeft}px)`
}

statusButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        currentStatus = btn.dataset.status
        moveIndicator(btn)

        if (searchInput.value.trim()) {
            searchBeatmaps(searchInput.value.trim())
        }
    })
})

requestAnimationFrame(() => moveIndicator(statusButtons[0]))

async function searchBeatmaps(query) {
    const url =
        `https://us-central1-rhythm-typer.cloudfunctions.net/api/getBeatmaps` +
        `?limit=50&status=${currentStatus}&sortBy=uploaded&showExplicit=true&language=all&search=${encodeURIComponent(query)}`

    let data
    try {
        data = await (await fetch(url)).json()
    } catch {
        return
    }

    resultsContainer.innerHTML = ""

    data.beatmaps.forEach(beatmap => {
        const card = document.createElement("div");
        card.className = "relative rounded-2xl overflow-hidden mb-4";

        const bg = document.createElement("div");
        bg.className = "absolute inset-0 bg-cover bg-center filter brightness-50 transition-all duration-300";
        bg.style.backgroundColor = "rgba(50, 50, 50, 0.7)"; // fallback

        if (beatmap.backgroundImageUrl) {
            const img = new Image()
            img.src = beatmap.backgroundImageUrl
            img.onload = () => {
                bg.style.backgroundImage = `url('${img.src}')`
            }
        }

        bg.style.filter = "brightness(0.45)"

        // content
        const content = document.createElement("div");
        content.className = "relative p-6 text-white";
        content.innerHTML = `
            <div class="font-bold text-lg">${beatmap.songName}</div>
            <div class="text-sm">${beatmap.artistName}</div>
            <div class="text-xs mt-1 mb-2">Status: ${beatmap.status}</div>
        `;

        card.append(bg, content)
        resultsContainer.appendChild(card)

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

                searchInput.value = ""
                resultsContainer.innerHTML = ""

                await processFile(file)
            } catch (err) {
                console.error("Failed to load beatmap:", err)
            }
        })
    })
}


function setMod(mod) {
    currentMod = mod
            
    const buttons = [modNoneBtn, modNCBtn, modHTBtn]
    buttons.forEach(btn => {
        btn.classList.remove('bg-green-500', 'bg-purple-500', 'bg-orange-500')
        btn.classList.add('bg-white/10', 'border', 'border-white/30')
    })
            
    if (mod === 'none') {
        modNoneBtn.classList.remove('bg-white/10', 'border', 'border-white/30')
        modNoneBtn.classList.add('bg-green-500')
    } else if (mod === 'nc') {
        modNCBtn.classList.remove('bg-white/10', 'border', 'border-white/30')
        modNCBtn.classList.add('bg-purple-500')
    } else if (mod === 'ht') {
        modHTBtn.classList.remove('bg-white/10', 'border', 'border-white/30')
        modHTBtn.classList.add('bg-orange-500')
    }

    updateResults()
    updateStarRating()
}

function playAudio() {
    if (!mapData || !mapData.files) return

    const audioFile = mapData.files.find(f => f.name.toLowerCase().startsWith('audio') && f.type === 'binary')
    if (!audioFile) {
        alert("No audio file found")
        return
    }

    if (songAudio.paused) {
        const audioBlob = new Blob([audioFile.content], { type: 'audio/*' })
        const audioUrl = URL.createObjectURL(audioBlob)
        songAudio.src = audioUrl
        songAudio.play()
        document.getElementById('playIcon').classList.add('hidden')
        document.getElementById('pauseIcon').classList.remove('hidden')
    } else {
        songAudio.pause()
        document.getElementById('playIcon').classList.remove('hidden')
        document.getElementById('pauseIcon').classList.add('hidden')
    }
}

modNoneBtn.addEventListener('click', () => setMod('none'))
modNCBtn.addEventListener('click', () => setMod('nc'))
modHTBtn.addEventListener('click', () => setMod('ht'))

perfectInput.addEventListener('input', () => {
    clampHits(perfectInput)
    updateResults()
})

goodInput.addEventListener('input', () => {
    clampHits(goodInput)
    updateResults()
})

okInput.addEventListener('input', () => {
    clampHits(okInput)
    updateResults()
})

missInput.addEventListener('input', () => {
    clampHits(missInput)
    updateResults()
})

comboInput.addEventListener('input', updateResults)

playButton.addEventListener('click', playAudio)

songAudio.addEventListener('ended', () => {
    document.getElementById('playIcon').classList.remove('hidden')
    document.getElementById('pauseIcon').classList.add('hidden')
})