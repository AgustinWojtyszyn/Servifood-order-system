import { useEffect } from 'react'

// En Genneia: forzar "Fruta" cuando no corresponde "Postre del día",
// tanto para almuerzo (single choice) como para cena (puede ser array o string).
export const useGenneiaPostreRules = ({
  isGenneia,
  isGenneiaPostreDay,
  allCustomOptions,
  visibleDinnerOptions,
  isGenneiaPostreOption,
  setCustomResponses,
  setCustomResponsesDinner
}) => {
  useEffect(() => {
    if (!isGenneia) return
    setCustomResponses((prev) => {
      let changed = false
      const updated = { ...prev }

      ;(allCustomOptions || []).forEach((option) => {
        if (!isGenneiaPostreOption(option)) return

        const current = prev[option.id]
        const isPostreSelected =
          typeof current === 'string' && current.toLowerCase().includes('postre')
        const frutaOption = option.options?.find((opt) => opt?.toLowerCase().includes('fruta'))

        // Forzar fruta cuando no es día de postre o preseleccionar fruta si está vacío
        const shouldForceFruta = !isGenneiaPostreDay && frutaOption
        if (shouldForceFruta && (!current || isPostreSelected)) {
          updated[option.id] = frutaOption
          changed = true
        }
      })

      return changed ? updated : prev
    })
  }, [isGenneia, isGenneiaPostreDay, allCustomOptions, isGenneiaPostreOption, setCustomResponses])

  useEffect(() => {
    if (!isGenneia) return
    if (!(visibleDinnerOptions || []).length) return
    setCustomResponsesDinner((prev) => {
      let changed = false
      const updated = { ...prev }

      ;(visibleDinnerOptions || []).forEach((option) => {
        if (!isGenneiaPostreOption(option)) return

        const current = prev[option.id]
        const frutaOption = option.options?.find((opt) => opt?.toLowerCase().includes('fruta'))
        const shouldForceFruta = !isGenneiaPostreDay && frutaOption

        if (Array.isArray(current)) {
          const cleaned = current.filter((val) => !val?.toLowerCase().includes('postre'))
          if (cleaned.length !== current.length) {
            updated[option.id] = cleaned.length ? cleaned : (shouldForceFruta ? [frutaOption] : [])
            changed = true
          } else if (!current.length && shouldForceFruta) {
            updated[option.id] = [frutaOption]
            changed = true
          }
          return
        }

        const isPostreSelected =
          typeof current === 'string' && current.toLowerCase().includes('postre')
        if (shouldForceFruta && (!current || isPostreSelected)) {
          updated[option.id] = frutaOption
          changed = true
        } else if (!isGenneiaPostreDay && isPostreSelected && !frutaOption) {
          updated[option.id] = null
          changed = true
        }
      })

      return changed ? updated : prev
    })
  }, [isGenneia, isGenneiaPostreDay, visibleDinnerOptions, isGenneiaPostreOption, setCustomResponsesDinner])
}

