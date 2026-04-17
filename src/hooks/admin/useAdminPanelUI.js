import { useState } from 'react'

const useAdminPanelUI = () => {
  const [activeTab, setActiveTab] = useState('users')
  const [menuWeekBaseDate, setMenuWeekBaseDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  })

  return {
    activeTab,
    setActiveTab,
    menuWeekBaseDate,
    setMenuWeekBaseDate
  }
}

export { useAdminPanelUI }
