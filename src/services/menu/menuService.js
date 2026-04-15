export const createMenuService = ({
  supabase,
  cache = null,
  invalidateCache = () => {},
  logAudit = null
} = {}) => {
  if (!supabase) {
    throw new Error('createMenuService requires a supabase client')
  }

  // Menú (por día)
  const getMenuDatesByRange = async ({ start, end }) => {
    if (!start || !end) return { data: [], error: null }
    const { data, error } = await supabase
      .from('menu_items')
      .select('menu_date')
      .gte('menu_date', start)
      .lte('menu_date', end)
      .order('menu_date', { ascending: true })
    if (error) return { data: [], error }
    const unique = []
    const seen = new Set()
    ;(data || []).forEach(row => {
      const value = row?.menu_date
      if (value && !seen.has(value)) {
        seen.add(value)
        unique.push({ menu_date: value })
      }
    })
    return { data: unique, error: null }
  }

  const getMenuItemsByDate = async (menuDate) => {
    const cacheKey = `menu-items:${menuDate}`
    const cached = cache?.get?.(cacheKey)
    if (cached) return { data: cached, error: null }

    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, description, created_at, menu_date')
      .eq('menu_date', menuDate)
      .order('created_at', { ascending: false })

    if (!error && data && cache?.set) {
      cache.set(cacheKey, data, 300000)
    }

    return { data, error }
  }

  const updateMenuItemsByDate = async (menuDate, menuItems, requestId = null) => {
    try {
      invalidateCache() // Limpiar cache al actualizar menú

      // Obtener items existentes (solo del día)
      const { data: existingItems, error: fetchError } = await supabase
        .from('menu_items')
        .select('id')
        .eq('menu_date', menuDate)

      if (fetchError) {
        console.error('Error fetching existing items:', fetchError)
        return { error: fetchError }
      }

      const existingIds = existingItems?.map(item => item.id) || []
      const itemsToUpdate = menuItems.filter(item => item.id && existingIds.includes(item.id))
      const itemsToInsert = menuItems.filter(item => !item.id || !existingIds.includes(item.id))
      const idsToKeep = menuItems.filter(item => item.id).map(item => item.id)
      const itemsToDelete = existingIds.filter(id => !idsToKeep.includes(id))

      // Eliminar items que ya no están en la lista (solo del día)
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('menu_items')
          .delete()
          .eq('menu_date', menuDate)
          .in('id', itemsToDelete)

        if (deleteError) {
          console.error('Error deleting items:', deleteError)
          return { error: deleteError }
        }
      }

      // Actualizar items existentes
      for (const item of itemsToUpdate) {
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({
            name: item.name,
            description: item.description
          })
          .eq('id', item.id)
          .eq('menu_date', menuDate)

        if (updateError) {
          console.error('Error updating item:', updateError)
          return { error: updateError }
        }
      }

      // Insertar nuevos items
      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('menu_items')
          .insert(itemsToInsert.map(item => ({
            name: item.name,
            description: item.description,
            menu_date: menuDate
          })))

        if (insertError) {
          console.error('Error inserting items:', insertError)
          return { error: insertError }
        }
      }

      // Obtener todos los items actualizados (solo del día)
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, description, created_at, menu_date')
        .eq('menu_date', menuDate)
        .order('created_at', { ascending: true })

      if (!error && typeof logAudit === 'function') {
        const summary = {
          inserted: itemsToInsert.length,
          updated: itemsToUpdate.length,
          deleted: itemsToDelete.length,
          total: data?.length || 0
        }
        await logAudit({
          action: 'menu_updated',
          details: `Menú diario actualizado (${menuDate}) (agregados: ${summary.inserted}, editados: ${summary.updated}, eliminados: ${summary.deleted}, total vigente: ${summary.total})`,
          target_name: 'Todos los usuarios',
          metadata: {
            summary,
            menu_date: menuDate,
            items: (menuItems || []).map(({ id, name }) => ({ id, name }))
          },
          request_id: requestId
        })
      }

      return { data, error }
    } catch (err) {
      console.error('Unexpected error in updateMenuItems:', err)
      return { error: err }
    }
  }

  // Menú de cena por fecha (opción exclusiva)
  const getDinnerMenuByDate = async ({ date, company }) => {
    const baseQuery = supabase
      .from('dinner_menu_by_date')
      .select('*')
      .eq('delivery_date', date)
      .limit(1)
      .maybeSingle()

    if (company) {
      const { data, error } = await baseQuery.eq('company', company)
      if (!error && data) return { data, error: null }
    }

    const { data, error } = await baseQuery.is('company', null)
    return { data, error }
  }

  const upsertDinnerMenuByDate = async ({ deliveryDate, company, title, options, active = true }) => {
    const payload = {
      delivery_date: deliveryDate,
      company: company || null,
      title,
      options,
      active,
      updated_at: new Date().toISOString()
    }
    const { data, error } = await supabase
      .from('dinner_menu_by_date')
      .upsert(payload, { onConflict: 'delivery_date,company' })
      .select()
    return { data, error }
  }

  const getDinnerMenusByDateRange = async ({ start, end }) => {
    const { data, error } = await supabase
      .from('dinner_menu_by_date')
      .select('*')
      .gte('delivery_date', start)
      .lte('delivery_date', end)
      .order('delivery_date', { ascending: true })
    return { data, error }
  }

  return {
    getMenuDatesByRange,
    getMenuItemsByDate,
    updateMenuItemsByDate,
    getDinnerMenuByDate,
    upsertDinnerMenuByDate,
    getDinnerMenusByDateRange
  }
}

