import { useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { COMPANY_CATALOG, COMPANY_LIST } from '../../constants/companyConfig'

export const useOrderCompany = () => {
  const { companySlug: companySlugParam } = useParams()
  const [searchParams] = useSearchParams()

  const recommendedCompany = typeof window !== 'undefined'
    ? window.localStorage.getItem('lastCompany')
    : null

  const defaultCompanySlug = recommendedCompany || COMPANY_LIST[0]?.slug || 'laja'
  const rawCompanySlug = (companySlugParam || searchParams.get('company') || defaultCompanySlug || '')
    .trim()
    .toLowerCase()

  const companyConfig = COMPANY_CATALOG[rawCompanySlug] || COMPANY_CATALOG[defaultCompanySlug]
  const companyOptionsSlug = (companyConfig?.optionsSourceSlug || companyConfig?.slug || rawCompanySlug || '')
    .trim()
    .toLowerCase()

  const isGenneia = (companyConfig?.slug || rawCompanySlug || '').toLowerCase() === 'genneia'

  const locations = useMemo(
    () => companyConfig?.locations || COMPANY_LIST[0]?.locations || [],
    [companyConfig]
  )

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      if (companyConfig?.slug) {
        window.localStorage.setItem('lastCompany', companyConfig.slug)
      }
    } catch (_err) {
      // no-op: fallback sin persistencia
    }
  }, [companyConfig?.slug])

  return {
    companySlugParam,
    defaultCompanySlug,
    rawCompanySlug,
    companyConfig,
    companyOptionsSlug,
    isGenneia,
    locations
  }
}
