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

  const isMissingColumnError = (error = null, column = '') => {
    if (!error || !column) return false
    const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
    return message.includes('column') && message.includes(column.toLowerCase())
  }

  const executeDinnerQuery = async (buildQuery) => {
    const queryWithCena = buildQuery().eq('meal_type', 'cena')
    const cenaResult = await queryWithCena
    if (!isMissingColumnError(cenaResult?.error, 'meal_type')) return cenaResult

    const queryWithDinner = buildQuery().eq('meal_type', 'dinner')
    const dinnerResult = await queryWithDinner
    if (!isMissingColumnError(dinnerResult?.error, 'meal_type')) return dinnerResult

    return buildQuery()
  }

  // Menú de cena por fecha (opción exclusiva)
  const getDinnerMenuByDate = async ({ date, company }) => {
    if (!date) return { data: null, error: null }

    const normalizedCompany = (company || '').toString().trim()
    const companyCandidates = Array.from(new Set(
      [normalizedCompany, normalizedCompany.toLowerCase()].filter(Boolean)
    ))

    const companyNameCandidates = Array.from(new Set(
      companyCandidates.flatMap(value => {
        const normalized = value.replace(/[_-]+/g, ' ').trim()
        if (!normalized) return []
        const titled = normalized
          .split(' ')
          .filter(Boolean)
          .map(part => part[0].toUpperCase() + part.slice(1))
          .join(' ')
        return [normalized, titled]
      })
    ))

    const fetchSingleByColumn = async ({ column, value, useNull = false }) => {
      const buildQuery = () => {
        let query = supabase
          .from('dinner_menu_by_date')
          .select('*')
          .eq('delivery_date', date)
          .limit(1)
          .maybeSingle()
        query = useNull ? query.is(column, null) : query.eq(column, value)
        return query
      }
      const result = await executeDinnerQuery(buildQuery)
      if (isMissingColumnError(result?.error, column)) return { data: null, error: null }
      return result
    }

    for (const candidate of companyCandidates) {
      const result = await fetchSingleByColumn({ column: 'company', value: candidate })
      if (!result?.error && result?.data) return { data: result.data, error: null }
      if (result?.error) return result
    }

    for (const candidate of companyCandidates) {
      const result = await fetchSingleByColumn({ column: 'company_id', value: candidate })
      if (!result?.error && result?.data) return { data: result.data, error: null }
      if (result?.error) return result
    }

    for (const candidate of companyNameCandidates) {
      const result = await fetchSingleByColumn({ column: 'company_name', value: candidate })
      if (!result?.error && result?.data) return { data: result.data, error: null }
      if (result?.error) return result
    }

    const globalNullResult = await fetchSingleByColumn({ column: 'company', useNull: true })
    if (!globalNullResult?.error && globalNullResult?.data) return { data: globalNullResult.data, error: null }
    if (globalNullResult?.error) return globalNullResult

    const globalEmptyResult = await fetchSingleByColumn({ column: 'company', value: '' })
    if (!globalEmptyResult?.error && globalEmptyResult?.data) return { data: globalEmptyResult.data, error: null }
    if (globalEmptyResult?.error) return globalEmptyResult

    return { data: null, error: null }
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
