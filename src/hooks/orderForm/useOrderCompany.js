import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { COMPANY_CATALOG, COMPANY_LIST } from '../../constants/companyConfig'
import { useAuthContext } from '../../contexts/authContextValue'
import { db } from '../../supabaseClient'

export const useOrderCompany = () => {
  const { companySlug: companySlugParam } = useParams()
  const [searchParams] = useSearchParams()
  const { isAdmin } = useAuthContext()
  const [activeCompanySlug, setActiveCompanySlug] = useState('')

  const recommendedCompany = typeof window !== 'undefined'
    ? window.localStorage.getItem('lastCompany')
    : null

  const fallbackCompanySlug = COMPANY_LIST[0]?.slug || 'laja'
  const defaultCompanyCandidate = activeCompanySlug || recommendedCompany || fallbackCompanySlug
  const defaultCompanySlug = (!COMPANY_CATALOG[defaultCompanyCandidate]?.adminOnly || isAdmin)
    ? defaultCompanyCandidate
    : fallbackCompanySlug
  const rawCompanySlug = (companySlugParam || searchParams.get('company') || defaultCompanySlug || '')
    .trim()
    .toLowerCase()

  const requestedCompany = COMPANY_CATALOG[rawCompanySlug]
  const requestedCompanyAllowed = requestedCompany && (!requestedCompany.adminOnly || isAdmin)
  const companyConfig = requestedCompanyAllowed
    ? requestedCompany
    : COMPANY_CATALOG[defaultCompanySlug]
  const companyOptionsSlug = (companyConfig?.optionsSourceSlug || companyConfig?.slug || rawCompanySlug || '')
    .trim()
    .toLowerCase()

  const isGenneia = (companyConfig?.slug || rawCompanySlug || '').toLowerCase() === 'genneia'

  const locations = useMemo(
    () => companyConfig?.locations || COMPANY_LIST[0]?.locations || [],
    [companyConfig]
  )

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data, error } = await db.getUserCompanySwitchContext()
      if (!mounted || error) return
      const slug = (data?.current_company_slug || '').toString().trim().toLowerCase()
      if (slug) setActiveCompanySlug(slug)
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

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
