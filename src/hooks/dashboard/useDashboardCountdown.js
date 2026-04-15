import { useEffect, useState } from 'react'

const ORDER_START_HOUR = 9
const ORDER_CUTOFF_HOUR = 22
const ORDER_TIMEZONE = 'America/Argentina/Buenos_Aires'

export const useDashboardCountdown = () => {
  const [countdownLabel, setCountdownLabel] = useState('Cierra en')
  const [countdownValue, setCountdownValue] = useState('--:--:--')
  const [countdownTone, setCountdownTone] = useState('normal')

  useEffect(() => {
    const formatCountdown = (ms) => {
      const totalSeconds = Math.max(Math.floor(ms / 1000), 0)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    }

    const updateCountdown = () => {
      try {
        const nowBA = new Date(new Date().toLocaleString('en-US', { timeZone: ORDER_TIMEZONE }))
        const openTime = new Date(nowBA)
        openTime.setHours(ORDER_START_HOUR, 0, 0, 0)
        const closeTime = new Date(nowBA)
        closeTime.setHours(ORDER_CUTOFF_HOUR, 0, 0, 0)

        let label = 'Cierra en'
        let target = closeTime

        if (nowBA < openTime) {
          label = 'Abre en'
          target = openTime
        } else if (nowBA >= closeTime) {
          label = 'Abre en'
          const nextOpen = new Date(openTime)
          nextOpen.setDate(nextOpen.getDate() + 1)
          target = nextOpen
        }

        const remainingMs = target - nowBA
        let tone = 'normal'
        if (label === 'Cierra en') {
          if (remainingMs <= 15 * 60 * 1000) {
            tone = 'urgent'
          } else if (remainingMs < 60 * 60 * 1000) {
            tone = 'warn'
          }
        }

        setCountdownLabel(label)
        setCountdownValue(formatCountdown(remainingMs))
        setCountdownTone(tone)
      } catch (err) {
        console.error('Error updating countdown', err)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  return { countdownLabel, countdownValue, countdownTone }
}

