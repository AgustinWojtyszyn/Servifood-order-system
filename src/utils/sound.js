const SUCCESS_SOUND_PATH = '/sounds/success.mp3'
const DEFAULT_VOLUME = 0.5

let enabled = true
let audio = null
let primed = false
let primeInFlight = null

const getAudio = () => {
  if (typeof Audio === 'undefined') return null
  if (audio) return audio

  const nextAudio = new Audio(SUCCESS_SOUND_PATH)
  nextAudio.preload = 'auto'
  nextAudio.volume = DEFAULT_VOLUME

  // iOS Safari inline playback hints
  nextAudio.playsInline = true
  nextAudio.setAttribute?.('playsinline', 'true')
  nextAudio.setAttribute?.('webkit-playsinline', 'true')

  audio = nextAudio
  return audio
}

const prime = async () => {
  if (!enabled || primed) return
  if (primeInFlight) return primeInFlight

  primeInFlight = (async () => {
    const el = getAudio()
    if (!el) return

    try {
      el.volume = 0
      await el.play()
      el.pause()
      el.currentTime = 0
      el.volume = DEFAULT_VOLUME
      primed = true
    } catch {
      // Silencioso: algunos navegadores pueden bloquear según contexto de gesto
      el.volume = DEFAULT_VOLUME
    }
  })().finally(() => {
    primeInFlight = null
  })

  return primeInFlight
}

const playSuccess = () => {
  if (!enabled) return
  const el = getAudio()
  if (!el) return

  try {
    el.currentTime = 0
    el.volume = DEFAULT_VOLUME
    const playPromise = el.play()
    if (playPromise?.catch) {
      playPromise.catch(() => {})
    }
  } catch {
    // No romper UX por audio
  }
}

const setEnabled = (value) => {
  enabled = Boolean(value)
}

export const Sound = {
  prime,
  playSuccess,
  setEnabled
}
