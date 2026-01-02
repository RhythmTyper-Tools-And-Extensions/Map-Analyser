import { MOD_SPEED_MULTIPLIERS } from './constants.js'

export function applyModToData(diffData, mod) {
    if (!diffData) return diffData

    const data = structuredClone(diffData)

    if (mod === 'nc') {
        const speedMult = MOD_SPEED_MULTIPLIERS.nc
        data.overallDifficulty = (80 - data.overallDifficulty * 6) / speedMult
        data.overallDifficulty = (data.overallDifficulty - 80) / -6
        data.notes.forEach(note => {
            if (note.time !== undefined) note.time /= speedMult
            if (note.startTime !== undefined) note.startTime /= speedMult
            if (note.endTime !== undefined) note.endTime /= speedMult
        })
    } else if (mod === 'ht') {
        const speedMult = MOD_SPEED_MULTIPLIERS.ht
        data.overallDifficulty = (80 - data.overallDifficulty * 6) / speedMult
        data.overallDifficulty = Math.max((data.overallDifficulty - 80) / -6, 0)
        data.notes.forEach(note => {
            if (note.time !== undefined) note.time /= speedMult
            if (note.startTime !== undefined) note.startTime /= speedMult
            if (note.endTime !== undefined) note.endTime /= speedMult
        })
    }

    return data
}