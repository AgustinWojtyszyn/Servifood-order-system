import { useState } from 'react'

export const useOrderSelectionsState = () => {
  const [menuItems, setMenuItems] = useState([])
  const [customOptionsLunch, setCustomOptionsLunch] = useState([])
  const [customOptionsDinner, setCustomOptionsDinner] = useState([])
  const [customResponses, setCustomResponses] = useState({})
  const [customResponsesDinner, setCustomResponsesDinner] = useState({})
  const [dinnerMenuSpecial, setDinnerMenuSpecial] = useState(null)
  const [dinnerSpecialChoice, setDinnerSpecialChoice] = useState(null)
  const [selectedItems, setSelectedItems] = useState({})
  const [selectedItemsDinner, setSelectedItemsDinner] = useState({})

  return {
    menuItems,
    setMenuItems,
    customOptionsLunch,
    setCustomOptionsLunch,
    customOptionsDinner,
    setCustomOptionsDinner,
    customResponses,
    setCustomResponses,
    customResponsesDinner,
    setCustomResponsesDinner,
    dinnerMenuSpecial,
    setDinnerMenuSpecial,
    dinnerSpecialChoice,
    setDinnerSpecialChoice,
    selectedItems,
    setSelectedItems,
    selectedItemsDinner,
    setSelectedItemsDinner
  }
}

