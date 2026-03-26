import { useState } from 'react'
import { db } from '../../supabaseClient'
import { notifyError, notifyInfo, notifySuccess } from '../../utils/notice'

const useAdminDinnerMenuActions = ({ dinnerMenusByDate }) => {
  const [dinnerDateSaving, setDinnerDateSaving] = useState({})

  const saveDinnerMenuDate = async (dateISO) => {
    const draft = dinnerMenusByDate[dateISO]
    if (!draft?.title?.trim()) {
      notifyInfo('El título es requerido')
      return
    }
    const filteredOptions = (draft.options || []).map(o => o.trim()).filter(Boolean)
    if (filteredOptions.length === 0) {
      notifyInfo('Debes agregar al menos una opción')
      return
    }
    setDinnerDateSaving(prev => ({ ...prev, [dateISO]: true }))
    try {
      const { error } = await db.upsertDinnerMenuByDate({
        deliveryDate: dateISO,
        company: draft.company || null,
        title: draft.title.trim(),
        options: filteredOptions,
        active: true
      })
      if (error) {
        notifyError('Error al guardar el menú de cena')
        return
      }
      notifySuccess('Menú de cena guardado')
    } catch (err) {
      console.error('Error saving dinner menu', err)
      notifyError('Error al guardar el menú de cena')
    } finally {
      setDinnerDateSaving(prev => ({ ...prev, [dateISO]: false }))
    }
  }

  return {
    dinnerDateSaving,
    saveDinnerMenuDate
  }
}

export { useAdminDinnerMenuActions }
