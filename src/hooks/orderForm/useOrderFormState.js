import { useState } from 'react'

export const useOrderFormState = () => {
  const [formData, setFormData] = useState({
    location: '',
    name: '',
    email: '',
    phone: '',
    comments: ''
  })
  const [mode, setMode] = useState('lunch') // legacy, derives from selection (keep for compat)
  const [dinnerEnabled, setDinnerEnabled] = useState(false)
  const [selectedTurns, setSelectedTurns] = useState({ lunch: true, dinner: false })
  const [success, setSuccess] = useState(false)
  const [hasOrderToday, setHasOrderToday] = useState(false)
  const [pendingLunch, setPendingLunch] = useState(false)
  const [pendingDinner, setPendingDinner] = useState(false)
  const [suggestion, setSuggestion] = useState(null) // último pedido sugerido
  const [suggestionVisible, setSuggestionVisible] = useState(false)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionSummary, setSuggestionSummary] = useState('')
  const [suggestionMode, setSuggestionMode] = useState('last')
  const [dinnerMenuEnabled, setDinnerMenuEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('dinner_menu_enabled')
    // Por defecto mostrar menú de cena si no hay preferencia previa
    return stored === null ? true : stored === 'true'
  })

  return {
    formData,
    setFormData,
    mode,
    setMode,
    dinnerEnabled,
    setDinnerEnabled,
    selectedTurns,
    setSelectedTurns,
    success,
    setSuccess,
    hasOrderToday,
    setHasOrderToday,
    pendingLunch,
    setPendingLunch,
    pendingDinner,
    setPendingDinner,
    suggestion,
    setSuggestion,
    suggestionVisible,
    setSuggestionVisible,
    suggestionLoading,
    setSuggestionLoading,
    suggestionSummary,
    setSuggestionSummary,
    suggestionMode,
    setSuggestionMode,
    dinnerMenuEnabled,
    setDinnerMenuEnabled
  }
}

