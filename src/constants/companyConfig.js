export const COMPANY_CATALOG = {
  genneia: {
    slug: 'genneia',
    name: 'Genneia',
    description: 'Pedidos y configuraciones especiales para personal de Genneia.',
    accent: 'from-amber-500 to-amber-600',
    badgeClass: 'bg-amber-100 text-amber-700',
    locations: ['Genneia'],
    customHint: 'Verás preguntas específicas y menú filtrado para Genneia.'
  },
  laja: {
    slug: 'laja',
    name: 'La Laja',
    description: 'Flujo dedicado para equipos que operan en La Laja.',
    accent: 'from-emerald-500 to-emerald-700',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    locations: ['La Laja'],
    customHint: 'Configura opciones solo visibles para pedidos de La Laja.'
  }
}

export const COMPANY_LIST = Object.values(COMPANY_CATALOG)
