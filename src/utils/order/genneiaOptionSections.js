const BEVERAGE_VALUES = [
  'agua',
  'coca',
  'coca cola',
  'coca zero',
  'gaseosa',
  'jugo',
  'soda',
  'sprite',
  'fanta',
  'zero'
]

const normalize = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const uniqueValues = (values = []) => {
  const seen = new Set()
  return values.filter((value) => {
    const key = normalize(value)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const hasKeyword = (value, keywords) => {
  const text = normalize(value)
  return keywords.some((keyword) => text.includes(keyword))
}

const classifyChoice = (choice) => {
  const text = normalize(choice)
  if (!text) return ''
  if (text.includes('fruta')) return 'fruta'
  if (text.includes('postre')) return 'postre'
  if (BEVERAGE_VALUES.some((keyword) => text.includes(keyword))) return 'bebidas'
  return ''
}

const buildSection = (option, section, title, values) => ({
  ...option,
  id: `${option.id}__${section}`,
  title,
  options: uniqueValues(values),
  required: false
})

const buildFruitDessertSection = (option, frutaValues, postreValues) =>
  buildSection(option, 'fruta_postre', 'Fruta o postre', [...frutaValues, ...postreValues])

export const normalizeGenneiaOptionSections = (options = [], isGenneia = false) => {
  if (!isGenneia) return options

  const normalized = []

  ;(options || []).forEach((option) => {
    if (!option || option.type === 'text' || !Array.isArray(option.options)) {
      normalized.push(option)
      return
    }

    const title = normalize(option.title)
    const buckets = {
      bebidas: [],
      fruta: [],
      postre: []
    }

    option.options.forEach((choice) => {
      const section = classifyChoice(choice)
      if (section) buckets[section].push(choice)
    })

    if (hasKeyword(title, ['bebida'])) {
      buckets.bebidas = buckets.bebidas.length ? buckets.bebidas : option.options
    }
    if (hasKeyword(title, ['fruta'])) {
      buckets.fruta = buckets.fruta.length ? buckets.fruta : ['Fruta']
    }
    if (hasKeyword(title, ['postre'])) {
      buckets.postre = buckets.postre.length ? buckets.postre : option.options.filter((choice) => normalize(choice).includes('postre'))
    }

    if (buckets.bebidas.length && !buckets.bebidas.some((choice) => normalize(choice) === 'coca zero')) {
      buckets.bebidas.push('Coca Zero')
    }

    const sectionCount = Object.values(buckets).filter((values) => values.length > 0).length
    if (sectionCount < 2) {
      normalized.push({
        ...option,
        options: buckets.bebidas.length ? uniqueValues(buckets.bebidas) : option.options
      })
      return
    }

    if (buckets.bebidas.length) normalized.push(buildSection(option, 'bebidas', 'Bebidas', buckets.bebidas))
    if (buckets.fruta.length && buckets.postre.length) {
      normalized.push(buildFruitDessertSection(option, buckets.fruta, buckets.postre))
    } else {
      if (buckets.fruta.length) normalized.push(buildSection(option, 'fruta', 'Fruta', buckets.fruta))
      if (buckets.postre.length) normalized.push(buildSection(option, 'postre', 'Postre', buckets.postre))
    }
  })

  return normalized
}
