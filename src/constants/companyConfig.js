export const COMPANY_CATALOG = {
  ccp: {
    slug: 'ccp',
    name: 'Ccp',
    description: 'Flujo dedicado para equipos que operan en Ccp.',
    accent: 'from-cyan-500 to-cyan-700',
    badgeClass: 'bg-cyan-100 text-cyan-700',
    locations: ['Ccp'],
    customHint: 'Mismas preguntas y opciones disponibles que La Laja.',
    optionsSourceSlug: 'laja'
  },
  laja: {
    slug: 'laja',
    name: 'La Laja',
    description: 'Flujo dedicado para equipos que operan en La Laja.',
    accent: 'from-emerald-500 to-emerald-700',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    locations: ['La Laja'],
    customHint: 'Configura opciones solo visibles para pedidos de La Laja.',
    optionsSourceSlug: 'laja'
  },
  padrebueno: {
    slug: 'padrebueno',
    name: 'Padre Bueno',
    description: 'Flujo dedicado para equipos que operan en Padre Bueno.',
    accent: 'from-sky-500 to-blue-700',
    badgeClass: 'bg-sky-100 text-sky-700',
    locations: ['Padre Bueno'],
    customHint: 'Mismas preguntas y opciones disponibles que La Laja.',
    optionsSourceSlug: 'laja'
  },
  losberros: {
    slug: 'losberros',
    name: 'Los Berros',
    description: 'Flujo dedicado para equipos que operan en Los Berros.',
    accent: 'from-teal-500 to-teal-700',
    badgeClass: 'bg-teal-100 text-teal-700',
    locations: ['Los Berros'],
    customHint: 'Mismas preguntas y opciones disponibles que La Laja.',
    optionsSourceSlug: 'laja'
  },
  genneia: {
    slug: 'genneia',
    name: 'Genneia',
    description: 'Pedidos y configuraciones especiales para personal de Genneia.',
    accent: 'from-amber-500 to-amber-600',
    badgeClass: 'bg-amber-100 text-amber-700',
    locations: ['Genneia'],
    customHint: 'Verás preguntas específicas y menú filtrado para Genneia.',
    optionsSourceSlug: 'genneia'
  }
}

export const COMPANY_LIST = Object.values(COMPANY_CATALOG)

export const COMPANY_LOCATIONS = COMPANY_LIST.flatMap((company) => company.locations || [])
