export const extractNumber = (name) => {
  const match = name?.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : Infinity
}

export const sortMenuItems = (items) => {
  return [...items].sort((a, b) => extractNumber(a.name) - extractNumber(b.name))
}
