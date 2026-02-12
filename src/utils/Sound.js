let successAudio = null

const SUCCESS_SOUND_URL = '/sounds/success.mp3'
const SUCCESS_VOLUME = 0.5

const getSuccessAudio = () => {
  if (typeof Audio === 'undefined') return null

  if (!successAudio) {
    successAudio = new Audio(SUCCESS_SOUND_URL)
    successAudio.preload = 'auto'
    successAudio.volume = SUCCESS_VOLUME
  }

  return successAudio
}

const primeSuccess = () => {
  const audio = getSuccessAudio()
  if (!audio) return

  try {
    audio.load()
  } catch {
    // Silencioso: no bloquear UI si el navegador falla al precargar
  }
}

const playSuccess = () => {
  const audio = getSuccessAudio()
  if (!audio) return

  try {
    audio.currentTime = 0
    const playPromise = audio.play()
    if (playPromise?.catch) {
      playPromise.catch(() => {})
    }
  } catch {
    // Silencioso: no romper UI por restricciones/autoplay
  }
}

export const Sound = {
  primeSuccess,
  playSuccess
}
