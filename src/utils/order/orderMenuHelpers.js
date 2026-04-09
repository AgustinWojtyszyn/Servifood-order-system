import { getSlotIndexFromTitle } from './menuDisplay'

const getSortSlotIndex = (item = {}, fallbackIndex = 0) => {
  if (Number.isFinite(item?.slotIndex)) return item.slotIndex
  const inferred = getSlotIndexFromTitle(item?.name)
  if (Number.isFinite(inferred)) return inferred
  return fallbackIndex
}

export const sortMenuItems = (items) => {
  return (items || [])
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aSlot = getSortSlotIndex(a.item, a.index)
      const bSlot = getSortSlotIndex(b.item, b.index)
      if (Number.isFinite(aSlot) && Number.isFinite(bSlot) && aSlot !== bSlot) return aSlot - bSlot

      const aDate = a.item?.created_at ? new Date(a.item.created_at).getTime() : null
      const bDate = b.item?.created_at ? new Date(b.item.created_at).getTime() : null
      if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) return aDate - bDate
      return a.index - b.index
    })
    .map(({ item }) => item)
}
