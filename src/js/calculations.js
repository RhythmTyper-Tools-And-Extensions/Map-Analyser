import { DIFFICULTY_PARAMS, MOD_MULTIPLIERS } from './constants.js'

export function getTotalObjects(diffData) {
    if (!diffData?.notes) {
        return { notes: 0, holds: 0, typing: 0, total: 0 }
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

export function calculateAccuracy(perfect, good, ok, miss, totalObjects) {
    const n300 = perfect || 0
    const n100 = good || 0
    const n50 = ok || 0
    const nmiss = miss || 0

    const totalHits = n300 + n100 + n50 + nmiss
    const { notes, holds, typing, total } = totalObjects
    const remaining = Math.max(0, (total + holds) - totalHits)

    const accuracy = totalHits === 0 
        ? 100 
        : (300 * n300 + 100 * n100 + 50 * n50) / (300 * totalHits) * 100

    return { 
        accuracy, 
        misses: nmiss,
        remaining,
        notes,
        holds,
        typing
    }
}

function convertNotes(notes) {
    const converted = []
    for (const note of notes) {
        if (note.type === "hold") {
            converted.push({ 
                startTime: note.startTime / 1000,
                endTime: note.endTime / 1000,
                type: note.type,
                key: note.key,
            })
        }
        if (note.type === "tap") {
            converted.push({ 
                time: note.time / 1000,
                startTime: note.time / 1000,
                type: note.type,
                key: note.key,
            })
        }
    }
    return converted
}

function chordBonus(k) {
    return 1 + 1.6 * (1 - Math.exp(-0.6 * Math.max(0, k - 1)))
}

function reusePenalty(d) {
    return 0.55 * Math.exp(-0.7 * (d - 1))
}

function buildEvents(notes) {
    const byTime = {}
    for (const n of notes) {
        (byTime[n.startTime] ??= []).push(n.key)
    }

    const times = Object.keys(byTime).map(Number).sort((a, b) => a - b)
    return times.map(t => {
        const keys = [...new Set(byTime[t])]
        return { t, keys }
    })
}

function buildEventsWithHoldEnds(notes) {
    const byTime = {}
    for (const n of notes) {
        (byTime[n.startTime] ??= []).push(n.key)

        if (n.type === 'hold' && n.endTime != null && n.endTime > n.startTime) {
            (byTime[n.endTime] ??= []).push(n.key)
        }
    }

    const times = Object.keys(byTime).map(Number).sort((a, b) => a - b)
    return times.map(t => ({
        t,
        keys: [...new Set(byTime[t])]
    }))
}

function calculateStrainEMA(events) {
    const { MIN_DT, ALPHA, HALF_LIFE } = DIFFICULTY_PARAMS
    
    let ema = 0
    let lastT = events[0].t
    const emaVals = []
    const history = []

    for (const e of events) {
        const dt = Math.max(MIN_DT, e.t - lastT)
        let strain = Math.pow(1 / dt, ALPHA)

        let reuse = 0
        for (let d = 1; d <= history.length; d++) {
            if (e.keys.some(k => history.at(-d).has(k))) {
                reuse += reusePenalty(d)
            }
        }

        strain *= Math.max(0.2, 1 - reuse)
        strain *= chordBonus(e.keys.length)

        const decay = Math.pow(0.5, dt / HALF_LIFE)
        ema = ema * decay + strain * (1 - decay)
        emaVals.push(ema)

        history.push(new Set(e.keys))
        if (history.length > 6) history.shift()

        lastT = e.t
    }

    return emaVals
}

function aggregateDifficulty(emaVals) {
    const { TAIL_FRAC } = DIFFICULTY_PARAMS
    emaVals.sort((a, b) => b - a)
    const take = Math.max(1, Math.floor(emaVals.length * TAIL_FRAC))
    return emaVals.slice(0, take).reduce((s, v) => s + v, 0) / take
}

function calculateBonuses(noteCount, od) {
    const { MAX_LEN_NOTES, MAX_LEN_BONUS, OD_SLOPE } = DIFFICULTY_PARAMS
    
    const x = Math.min(noteCount, MAX_LEN_NOTES)
    const lenBonus = 1 + (MAX_LEN_BONUS - 1) * Math.log(1 + x) / Math.log(1 + MAX_LEN_NOTES)
    const odBonus = 1 + OD_SLOPE * (od - 5)
    
    return { lenBonus, odBonus }
}

export function calculatePP(scoreData) {
    const notes = convertNotes(scoreData.notes)
    const od = Math.min(10, Math.max(0, scoreData.overallDifficulty ?? 0))
    const acc = scoreData.accuracy / 100

    const events = buildEvents(notes)
    const emaVals = calculateStrainEMA(events)
    const core = aggregateDifficulty(emaVals)
    const { lenBonus, odBonus } = calculateBonuses(notes.length, od)
    
    const accBonus = Math.pow(acc, 5)

    return core * lenBonus * DIFFICULTY_PARAMS.PP_PER_UNIT * odBonus * accBonus
}

export function calculateStars(scoreData) {
    const notes = convertNotes(scoreData.notes)
    const od = Math.min(10, Math.max(0, scoreData.overallDifficulty ?? 0))

    const events = buildEventsWithHoldEnds(notes)
    const emaVals = calculateStrainEMA(events)
    const core = aggregateDifficulty(emaVals)
    const { lenBonus, odBonus } = calculateBonuses(events.length, od)

    return core * lenBonus * odBonus * DIFFICULTY_PARAMS.STAR_SCALE
}

export function calculateMaxScore(totalObjects, currentMod) {
    const { holds, total } = totalObjects
    const totalNotes = total + holds

    const modMultiplier = MOD_MULTIPLIERS[currentMod] || 1.0
    
    let maxScore = 0
    for (let i = 0; i < totalNotes; i++) {
        maxScore += 300 * (1 + i * 0.001)
    }
    
    maxScore *= modMultiplier

    return { maxScore: Math.round(maxScore) }
}