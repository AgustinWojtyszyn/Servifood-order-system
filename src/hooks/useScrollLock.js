import { useEffect } from 'react'

let lockCount = 0
let previousBodyOverflow = ''
let previousHtmlOverflow = ''
let previousBodyPaddingRight = ''

const isDebug =
  typeof import.meta !== 'undefined' &&
  import.meta?.env?.VITE_SCROLL_DEBUG === '1' &&
  typeof window !== 'undefined'

function updateDebugSnapshot() {
  if (!isDebug || typeof document === 'undefined') return
  const html = document.documentElement
  const body = document.body

  window.__scrollDebug = {
    htmlOverflow: html?.style?.overflow || '',
    bodyOverflow: body?.style?.overflow || '',
    bodyPaddingRight: body?.style?.paddingRight || '',
    activeLocksCount: lockCount,
    // Ayuda a diagnosticar: devuelve el estado actual sin mutar nada.
    getSnapshot: () => ({
      htmlOverflow: html?.style?.overflow || '',
      bodyOverflow: body?.style?.overflow || '',
      bodyPaddingRight: body?.style?.paddingRight || '',
      activeLocksCount: lockCount
    }),
    // Útil en dev para restaurar estilos si algo quedó pegado.
    restore: () => {
      lockCount = 0
      restoreScroll()
      updateDebugSnapshot()
    }
  }
}

function restoreScroll() {
  const html = document.documentElement
  const body = document.body

  if (!html || !body) return

  html.style.overflow = previousHtmlOverflow
  body.style.overflow = previousBodyOverflow
  body.style.paddingRight = previousBodyPaddingRight
  updateDebugSnapshot()
}

export const useScrollLock = (isLocked) => {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    if (!html || !body) return

    let applied = false

    const lockScroll = () => {
      if (applied) return

      if (lockCount === 0) {
        previousBodyOverflow = body.style.overflow
        previousHtmlOverflow = html.style.overflow
        previousBodyPaddingRight = body.style.paddingRight
      }

      lockCount += 1
      const scrollbarWidth = window.innerWidth - html.clientWidth
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`
      }

      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      applied = true
      updateDebugSnapshot()
    }

    const unlockScroll = () => {
      if (!applied) return

      lockCount = Math.max(lockCount - 1, 0)
      if (lockCount === 0) {
        restoreScroll()
      } else {
        updateDebugSnapshot()
      }
      applied = false
    }

    if (isLocked) {
      lockScroll()
    } else {
      updateDebugSnapshot()
    }

    return () => {
      unlockScroll()
    }
  }, [isLocked])
}
