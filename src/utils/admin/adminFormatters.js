import { COMPANY_LIST } from '../../constants/companyConfig'

export const getCompanyLabel = (slug) => {
  if (!slug) return 'Todas las empresas'
  const match = COMPANY_LIST.find(c => c.slug === slug)
  return match ? match.name : slug
}

export const getCompanyBadgeClass = (slug) => {
  if (!slug) return 'bg-gray-100 text-gray-700'
  const match = COMPANY_LIST.find(c => c.slug === slug)
  return match?.badgeClass || 'bg-gray-100 text-gray-700'
}

export const formatShortDate = (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '—')
