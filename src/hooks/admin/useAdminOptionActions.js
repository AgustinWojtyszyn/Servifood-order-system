import { useState } from 'react'
import { db } from '../../supabaseClient'
import { confirmAction } from '../../utils/confirm'
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../../utils/notice'

const useAdminOptionActions = ({
  customOptions,
  dessertOption,
  dessertOverrideDate,
  dessertOverrideEnabled,
  setDessertOverrideEnabled,
  setLoadingDessertOverride,
  refreshOptions
}) => {
  const [editingOptions, setEditingOptions] = useState(false)
  const [newOption, setNewOption] = useState(null)
  const [showDessertConfirm, setShowDessertConfirm] = useState(false)

  const handleCreateOption = () => {
    setNewOption({
      title: '',
      type: 'multiple_choice',
      options: [''],
      required: false,
      active: true,
      company: '',
      meal_scope: 'both',
      days_of_week: null,
      only_holidays: false,
      exclude_holidays: false,
      dinner_only: false
    })
    setEditingOptions(true)
  }

  const handleEditOption = (option) => {
    if (!option) return
    setNewOption({
      ...option,
      options: Array.isArray(option.options) && option.options.length > 0 ? option.options : [''],
      meal_scope: option.meal_scope || (option.dinner_only ? 'dinner' : 'both'),
      days_of_week: option.days_of_week || null,
      company: option.company || '',
      only_holidays: option.only_holidays || false,
      exclude_holidays: option.exclude_holidays || false
    })
    setEditingOptions(true)
  }

  const handleSaveOption = async () => {
    if (!newOption?.title?.trim()) {
      notifyInfo('El título es requerido')
      return
    }

    if ((newOption.type === 'multiple_choice' || newOption.type === 'checkbox') &&
        newOption.options.filter(opt => opt.trim()).length === 0) {
      notifyInfo('Debes agregar al menos una opción')
      return
    }

    try {
      const daysArray = Array.isArray(newOption.days_of_week) ? newOption.days_of_week.filter(Boolean) : []
      const filteredOptions = (newOption.type === 'multiple_choice' || newOption.type === 'checkbox')
        ? newOption.options.filter(opt => opt.trim())
        : null

      const existing = newOption.id ? customOptions.find(opt => opt.id === newOption.id) : null

      const optionData = {
        title: newOption.title,
        type: newOption.type,
        options: filteredOptions,
        order_position: existing?.order_position ?? customOptions.length,
        company: newOption.company || null,
        active: newOption.active ?? true,
        days_of_week: daysArray.length === 0 ? null : daysArray,
        only_holidays: newOption.only_holidays || false,
        exclude_holidays: newOption.exclude_holidays || false,
        meal_scope: newOption.meal_scope || (newOption.dinner_only ? 'dinner' : 'both'),
        required: !!newOption.required
      }

      if (optionData.only_holidays && optionData.exclude_holidays) {
        notifyWarning('No podés marcar "Solo feriados" y "Excluir feriados" al mismo tiempo.')
        return
      }

      const { error } = newOption.id
        ? await db.updateCustomOption(newOption.id, optionData)
        : await db.createCustomOption(optionData)

      if (error) {
        console.error('❌ Error al guardar opción:', error)
        notifyError(`Error al guardar la opción: ${error.message}`)
      } else {
        setNewOption(null)
        setEditingOptions(false)
        await refreshOptions()
        notifySuccess('Opción guardada exitosamente.')
      }
    } catch (err) {
      console.error('❌ Error:', err)
      notifyError('Error al guardar la opción')
    }
  }

  const handleDeleteOption = async (optionId) => {
    const confirmed = await confirmAction({
      title: 'Eliminar opción',
      message: '¿Estás seguro de eliminar esta opción?',
      confirmText: 'Eliminar'
    })
    if (!confirmed) return

    try {
      const { error } = await db.deleteCustomOption(optionId)
      if (error) {
        notifyError('Error al eliminar la opción')
      } else {
        await refreshOptions()
        notifySuccess('Opción eliminada exitosamente')
      }
    } catch (err) {
      console.error('Error:', err)
      notifyError('Error al eliminar la opción')
    }
  }

  const handleToggleOption = async (optionId, currentState) => {
    try {
      const { error } = await db.updateCustomOption(optionId, { active: !currentState })
      if (error) {
        notifyError('Error al actualizar la opción')
      } else {
        await refreshOptions()
      }
    } catch (err) {
      console.error('Error:', err)
      notifyError('Error al actualizar la opción')
    }
  }

  const handleMoveOption = async (index, direction) => {
    const newOptions = [...customOptions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newOptions.length) return

    ;[newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]]

    try {
      await db.updateCustomOptionsOrder(newOptions)
      await refreshOptions()
    } catch (err) {
      console.error('Error:', err)
      notifyError('Error al reordenar')
    }
  }

  const handleOptionFieldChange = (field, value) => {
    setNewOption(prev => ({ ...prev, [field]: value }))
  }

  const toggleDay = (dayNumber) => {
    setNewOption(prev => {
      const current = Array.isArray(prev.days_of_week) ? prev.days_of_week : []
      const exists = current.includes(dayNumber)
      const next = exists ? current.filter(d => d !== dayNumber) : [...current, dayNumber]
      return { ...prev, days_of_week: next.length ? next : null }
    })
  }

  const handleAddOptionChoice = () => {
    setNewOption(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }))
  }

  const handleRemoveOptionChoice = (index) => {
    setNewOption(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  const handleOptionChoiceChange = (index, value) => {
    setNewOption(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? value : opt))
    }))
  }

  const handleToggleDessertOverride = async ({ skipConfirm = false } = {}) => {
    if (!dessertOption) return
    const newValue = !dessertOverrideEnabled

    if (dessertOverrideEnabled && !skipConfirm) {
      setShowDessertConfirm(true)
      return
    }

    setLoadingDessertOverride(true)
    try {
      const { error } = await db.setCustomOptionOverride({
        optionId: dessertOption.id,
        date: dessertOverrideDate,
        enabled: newValue
      })
      if (error) {
        console.error('Error toggling dessert override', error)
        notifyError('No se pudo actualizar el postre para esa fecha')
      } else {
        setDessertOverrideEnabled(newValue)
        notifySuccess(newValue ? 'Postre habilitado para la fecha seleccionada' : 'Postre deshabilitado para esa fecha')
      }
    } catch (err) {
      console.error('Error toggling dessert override', err)
      notifyError('No se pudo actualizar el postre para esa fecha')
    } finally {
      setLoadingDessertOverride(false)
      setShowDessertConfirm(false)
    }
  }

  const cancelOptionEdit = () => {
    setEditingOptions(false)
    setNewOption(null)
  }

  const closeDessertConfirm = () => setShowDessertConfirm(false)

  const confirmDessertDisable = () => handleToggleDessertOverride({ skipConfirm: true })

  return {
    editingOptions,
    newOption,
    showDessertConfirm,
    handleCreateOption,
    handleEditOption,
    handleSaveOption,
    handleDeleteOption,
    handleToggleOption,
    handleMoveOption,
    handleOptionFieldChange,
    toggleDay,
    handleAddOptionChoice,
    handleRemoveOptionChoice,
    handleOptionChoiceChange,
    handleToggleDessertOverride,
    closeDessertConfirm,
    confirmDessertDisable,
    cancelOptionEdit
  }
}

export { useAdminOptionActions }
