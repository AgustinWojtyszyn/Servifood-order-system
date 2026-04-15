import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import RequireUser from './RequireUser'
import { COMPANY_CATALOG } from '../constants/companyConfig'
import { Sound } from '../utils/Sound'
import OrderErrorBanner from './order-form/OrderErrorBanner'
import OrderFormHeader from './order-form/OrderFormHeader'
import OrderCommentsSection from './order-form/OrderCommentsSection'
import OrderPersonalInfoSection from './order-form/OrderPersonalInfoSection'
import OrderLunchSummary from './order-form/OrderLunchSummary'
import OrderSuggestionPanel from './order-form/OrderSuggestionPanel'
import OrderTurnSelector from './order-form/OrderTurnSelector'
import OrderLunchMenuSection from './order-form/OrderLunchMenuSection'
import OrderConfirmModal from './order-form/OrderConfirmModal'
import OrderLunchOptionsSection from './order-form/OrderLunchOptionsSection'
import OrderDinnerMenuSection from './order-form/OrderDinnerMenuSection'
import OrderDinnerOptionsSection from './order-form/OrderDinnerOptionsSection'
import OrderSuccessScreen from './order-form/OrderSuccessScreen'
import OrderHoursBanner from './order-form/OrderHoursBanner'
import { formatResponseValue } from '../utils/order/orderFormatters'
import { notifyInfo } from '../utils/notice'
import { useOrderSubmit } from '../hooks/useOrderSubmit'
import {
  isGenneiaPostreOption,
  isBeverageOrDessertOption,
  isDinnerOverrideValue,
  isOutsideWindow
} from '../utils/order/orderBusinessRules'
import { useOrderBootstrap } from '../hooks/useOrderBootstrap'
import { useOrderCompany } from '../hooks/orderForm/useOrderCompany'
import { useGenneiaPostreDay } from '../hooks/orderForm/useGenneiaPostreDay'
import { useGenneiaPostreRules } from '../hooks/orderForm/useGenneiaPostreRules'
import { useCustomSideGuards } from '../hooks/orderForm/useCustomSideGuards'
import { useLunchOptionsUI } from '../hooks/orderForm/useLunchOptionsUI'
import { useDinnerMenuItemsUI } from '../hooks/orderForm/useDinnerMenuItemsUI'
import { useOrderLunchSelection } from '../hooks/orderForm/useOrderLunchSelection'
import { useOrderDinnerSelection } from '../hooks/orderForm/useOrderDinnerSelection'
import { useOrderRepeatPayload } from '../hooks/orderForm/useOrderRepeatPayload'
import { useOrderSuggestionHandlers } from '../hooks/orderForm/useOrderSuggestionHandlers'
import { useOrderCustomResponses } from '../hooks/orderForm/useOrderCustomResponses'
import { useOrderTotals } from '../hooks/orderForm/useOrderTotals'
import { useOrderFormEffects } from '../hooks/orderForm/useOrderFormEffects'
import {
  clearDinnerOverrideResponses as clearDinnerOverrideResponsesPure,
} from '../utils/order/orderDinnerOverride'

const OrderForm = ({ user, loading }) => {
  const [menuItems, setMenuItems] = useState([])
  const [customOptionsLunch, setCustomOptionsLunch] = useState([])
  const [customOptionsDinner, setCustomOptionsDinner] = useState([])
  const [customResponses, setCustomResponses] = useState({})
  const [customResponsesDinner, setCustomResponsesDinner] = useState({})
  const [dinnerMenuSpecial, setDinnerMenuSpecial] = useState(null)
  const [dinnerSpecialChoice, setDinnerSpecialChoice] = useState(null)
  const [selectedItems, setSelectedItems] = useState({})
  const [selectedItemsDinner, setSelectedItemsDinner] = useState({})
  const [formData, setFormData] = useState({
    location: '',
    name: '',
    email: '',
    phone: '',
    comments: ''
  })
  const [mode, setMode] = useState('lunch') // legacy, derives from selection (keep for compat)
  const [dinnerEnabled, setDinnerEnabled] = useState(false)
  const [selectedTurns, setSelectedTurns] = useState({ lunch: true, dinner: false })
  const [success, setSuccess] = useState(false)
  const [hasOrderToday, setHasOrderToday] = useState(false)
  const [pendingLunch, setPendingLunch] = useState(false)
  const [pendingDinner, setPendingDinner] = useState(false)
  const [suggestion, setSuggestion] = useState(null) // último pedido sugerido
  const [suggestionVisible, setSuggestionVisible] = useState(false)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionSummary, setSuggestionSummary] = useState('')
  const [suggestionMode, setSuggestionMode] = useState('last')
  const [dinnerMenuEnabled, setDinnerMenuEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('dinner_menu_enabled')
    // Por defecto mostrar menú de cena si no hay preferencia previa
    return stored === null ? true : stored === 'true'
  })
  const navigate = useNavigate()
  const locationState = useLocation()

  const {
    companySlugParam,
    rawCompanySlug,
    companyConfig,
    companyOptionsSlug,
    isGenneia,
    locations
  } = useOrderCompany()

  const isGenneiaPostreOptionLocal = (option = {}) => isGenneiaPostreOption(isGenneia, option)
  const { isGenneiaPostreDay } = useGenneiaPostreDay({ isGenneia })

  const activeOptions = useMemo(
    () => customOptionsLunch.filter(opt => opt.active),
    [customOptionsLunch]
  )

  // Opciones visibles para almuerzo (excluye flags de solo cena)
  const visibleLunchOptions = useMemo(
    () => activeOptions.filter(Boolean),
    [activeOptions]
  )

  // Opciones visibles para cena (incluye comunes + solo cena; se vacía si el usuario no tiene cena habilitada)
  const visibleDinnerOptions = useMemo(() => {
    if (!dinnerEnabled) return []
    return customOptionsDinner.filter(opt => opt.active)
  }, [customOptionsDinner, dinnerEnabled])

  const {
    canChooseCustomSideForSelection,
    canChooseCustomSideForDinner
  } = useCustomSideGuards({
    isGenneia,
    selectedTurns,
    menuItems,
    selectedItems,
    selectedItemsDinner,
    visibleLunchOptions,
    visibleDinnerOptions,
    setCustomResponses,
    setCustomResponsesDinner
  })

  const lunchOptionsUI = useLunchOptionsUI({
    visibleLunchOptions,
    customResponses,
    isGenneia,
    isGenneiaPostreDay,
    canChooseCustomSideForSelection
  })

  const dinnerMenuItemsUI = useDinnerMenuItemsUI({ menuItems, selectedItemsDinner })

  // Custom side guards moved to useCustomSideGuards

  // Unificado (evitar duplicados por id)
  const allCustomOptions = useMemo(() => {
    const seen = new Set()
    return [...customOptionsLunch, ...customOptionsDinner].filter(opt => {
      if (!opt?.id) return false
      if (seen.has(opt.id)) return false
      seen.add(opt.id)
      return true
    })
  }, [customOptionsLunch, customOptionsDinner])

  useGenneiaPostreRules({
    isGenneia,
    isGenneiaPostreDay,
    allCustomOptions,
    visibleDinnerOptions,
    isGenneiaPostreOption: isGenneiaPostreOptionLocal,
    setCustomResponses,
    setCustomResponsesDinner
  })

  useOrderBootstrap({
    user,
    rawCompanySlug,
    companyOptionsSlug,
    dinnerEnabled,
    setDinnerEnabled,
    setSelectedTurns,
    setMode,
    setFormData,
    setMenuItems,
    setCustomOptionsLunch,
    setCustomOptionsDinner,
    setDinnerMenuSpecial,
    setPendingLunch,
    setPendingDinner,
    setHasOrderToday,
    setSuggestion,
    setSuggestionMode,
    setSuggestionVisible,
    setSuggestionSummary,
    setSuggestionLoading
  })

  useOrderFormEffects({
    companySlugParam,
    rawCompanySlug,
    companyCatalog: COMPANY_CATALOG,
    navigate,
    dinnerMenuSpecial,
    setDinnerSpecialChoice,
    locations,
    setFormData,
    setCustomResponses,
    success,
    playSuccess: Sound.playSuccess
  })

  useOrderRepeatPayload({
    locationState,
    menuItems,
    menuItemsLength: menuItems.length,
    locations,
    dinnerEnabled,
    dinnerMenuEnabled,
    setSelectedItems,
    setSelectedItemsDinner,
    setCustomResponses,
    setCustomResponsesDinner,
    setDinnerSpecialChoice,
    setSelectedTurns,
    setMode,
    setFormData
  })

  // Genneia postre/fruta moved to useGenneiaPostreRules

  // Custom side cleanup moved to useCustomSideGuards

  // bootstrap moved to useOrderBootstrap

  const { handleItemSelect } = useOrderLunchSelection({
    menuItems,
    selectedItems,
    setSelectedItems,
    notifyInfo
  })

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const { handleCustomResponse, setCustomResponsesDinnerSafe } = useOrderCustomResponses({
    visibleLunchOptions,
    setCustomResponses,
    notifyInfo,
    canChooseCustomSideForSelection,
    dinnerSpecialChoice,
    setCustomResponsesDinner,
    isBeverageOrDessertOption,
    canChooseCustomSideForDinner
  })

  const clearDinnerOverrideResponses = () => {
    setCustomResponsesDinner(prev => clearDinnerOverrideResponsesPure({ prevResponses: prev, isDinnerOverrideValue }))
  }

  const {
    getSelectedItemsList,
    getSelectedItemsListDinner,
    calculateTotal,
    calculateTotalDinner,
    getDinnerOverrideChoice,
    validateDinnerExclusivity,
    hasAnySelectedItems
  } = useOrderTotals({
    menuItems,
    selectedItems,
    selectedItemsDinner,
    dinnerSpecialChoice,
    customResponsesDinner,
    visibleDinnerOptions,
    selectedTurns,
    dinnerEnabled,
    dinnerMenuEnabled
  })

  const {
    handleItemSelectDinner,
    clearDinnerMenuSelections,
    handleDinnerSpecialSelect
  } = useOrderDinnerSelection({
    menuItems,
    selectedItemsDinner,
    setSelectedItemsDinner,
    dinnerSpecialChoice,
    setDinnerSpecialChoice,
    setCustomResponsesDinner,
    clearDinnerOverrideResponses,
    notifyInfo
  })

  const { handleRepeatSuggestion, handleDismissSuggestion } = useOrderSuggestionHandlers({
    suggestion,
    setSuggestionVisible,
    setSuggestion,
    setSuggestionSummary,
    setSuggestionMode,
    menuItems,
    locations,
    isGenneia,
    setSelectedItems,
    setSelectedItemsDinner,
    setCustomResponses,
    setCustomResponsesDinner,
    setDinnerSpecialChoice,
    setSelectedTurns,
    setMode,
    setFormData,
    clearDinnerOverrideResponses
  })


  const {
    submitting,
    confirmOpen,
    confirmData,
    error,
    handleSubmit,
    handleConfirmSubmit,
    closeConfirm
  } = useOrderSubmit({
    user,
    formData,
    locations,
    selectedTurns,
    dinnerEnabled,
    dinnerMenuEnabled,
    pendingLunch,
    pendingDinner,
    visibleLunchOptions,
    visibleDinnerOptions,
    customResponses,
    customResponsesDinner,
    isGenneiaPostreOption: isGenneiaPostreOptionLocal,
    getSelectedItemsList,
    getSelectedItemsListDinner,
    getDinnerOverrideChoice,
    dinnerSpecialTitle: dinnerMenuSpecial?.title,
    validateDinnerExclusivity,
    calculateTotal,
    calculateTotalDinner,
    companyConfig,
    isOutsideWindow,
    setSelectedTurns,
    setSuccess,
    navigate,
    rawCompanySlug
  })

  if (success) {
    return (
      <RequireUser user={user} loading={loading}>
        <OrderSuccessScreen />
      </RequireUser>
    )
  }

  return (
    <RequireUser user={user} loading={loading}>
      <div
        className="p-3 sm:p-6 min-h-dvh flex flex-col"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 mb-4 flex-1">
          <OrderFormHeader companyName={companyConfig.name} isGenneia={isGenneia} />
          {!hasOrderToday && <OrderHoursBanner />}

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Sugerencias inteligentes */}
            <OrderSuggestionPanel
              suggestionVisible={suggestionVisible}
              suggestion={suggestion}
              suggestionMode={suggestionMode}
              suggestionSummary={suggestionSummary}
              suggestionLoading={suggestionLoading}
              onRepeat={handleRepeatSuggestion}
              onDismiss={handleDismissSuggestion}
            />
            {/* Información Personal */}
            <OrderPersonalInfoSection
              formData={formData}
              locations={locations}
              onChange={handleFormChange}
            />

            {/* Selección de Menú */}
            <OrderLunchMenuSection
              items={menuItems}
              selectedItems={selectedItems}
              onToggleItem={handleItemSelect}
            />

            {/* Resumen del Pedido */}
            <OrderLunchSummary
              items={getSelectedItemsList()}
              total={calculateTotal()}
              onRemove={(itemId) => handleItemSelect(itemId, false)}
            />

            {/* Opciones Personalizadas - Solo mostrar opciones activas */}
            {lunchOptionsUI.length > 0 && (
              <OrderLunchOptionsSection
                options={lunchOptionsUI}
                companyName={companyConfig.name}
                onCustomResponse={handleCustomResponse}
              />
            )}

            {dinnerEnabled && dinnerMenuEnabled && (
              <OrderTurnSelector
                selectedTurns={selectedTurns}
                onToggleLunch={() => setSelectedTurns(prev => ({ ...prev, lunch: !prev.lunch }))}
                onToggleDinner={() => setSelectedTurns(prev => ({ ...prev, dinner: !prev.dinner }))}
              />
            )}

            {dinnerEnabled && dinnerMenuEnabled && selectedTurns.dinner && (
              <div className="space-y-4">
                <OrderDinnerMenuSection
                  items={dinnerMenuItemsUI}
                  total={calculateTotalDinner()}
                  onToggleItem={handleItemSelectDinner}
                />

                <OrderDinnerOptionsSection
                  options={visibleDinnerOptions}
                  customResponsesDinner={customResponsesDinner}
                  setCustomResponsesDinner={setCustomResponsesDinnerSafe}
                  isGenneia={isGenneia}
                  isGenneiaPostreDay={isGenneiaPostreDay}
                  customSideBlocked={!canChooseCustomSideForDinner}
                  isDinnerOverrideValue={isDinnerOverrideValue}
                  clearDinnerMenuSelections={clearDinnerMenuSelections}
                  dinnerSpecial={dinnerMenuSpecial}
                  dinnerSpecialChoice={dinnerSpecialChoice}
                  onDinnerSpecialSelect={handleDinnerSpecialSelect}
                />
              </div>
            )}

            {/* Información Adicional */}
            <OrderCommentsSection comments={formData.comments} onCommentsChange={handleFormChange} />

            <OrderErrorBanner error={error} />

            {/* Botón de confirmación - SIEMPRE visible al fondo, nunca fijo en mobile */}
            <div
              className="w-full bg-linear-to-t from-white via-white to-white/95 sm:bg-transparent p-4 sm:p-0 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] sm:shadow-none border-t-2 sm:border-t-0 border-gray-200 flex justify-center sm:mt-6 z-40"
              style={{
                position: 'relative',
                bottom: 'auto',
                left: 'auto',
                right: 'auto',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)'
              }}
            >
              <button
                type="submit"
                onClick={() => {
                  Sound.primeSuccess()
                }}
                disabled={loading || submitting || !hasAnySelectedItems || hasOrderToday}
                style={{ 
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  WebkitAppearance: 'none'
                }}
                className="w-full sm:w-auto hover:bg-green-700 font-black py-5 px-8 rounded-xl shadow-2xl hover:shadow-green-500/50 transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-2xl border-2 border-green-600"
              >
                {(loading || submitting) ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Creando pedido...</span>
                  </>
                ) : hasOrderToday ? (
                  <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Ya tienes un pedido pendiente</span>
                ) : (
                  <>
                    <ShoppingCart className="h-6 w-6 mr-3" style={{ color: '#ffffff', stroke: '#ffffff', strokeWidth: 2 }} />
                    <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', fontWeight: '900' }}>Confirmar Pedido</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {confirmOpen && confirmData && (
        <OrderConfirmModal
          open={confirmOpen}
          confirmData={confirmData}
          submitting={submitting}
          onClose={closeConfirm}
          onConfirm={handleConfirmSubmit}
          formatResponseValue={formatResponseValue}
        />
      )}
    </RequireUser>
  )
}

export default OrderForm
