export const sortMenuItems = (items) => {
  return (items || [])
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aDate = a.item?.created_at ? new Date(a.item.created_at).getTime() : null
      const bDate = b.item?.created_at ? new Date(b.item.created_at).getTime() : null
      if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) return aDate - bDate
      return a.index - b.index
    })
    .map(({ item }) => item)
}
