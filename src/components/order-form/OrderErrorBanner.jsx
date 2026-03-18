const OrderErrorBanner = ({ error }) => {
  if (!error) return null

  return (
    <div
      className="bg-red-50 border-2 border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base flex items-start gap-2 shadow-md w-full"
      role="alert"
      aria-live="assertive"
    >
      <span className="mt-0.5 text-red-600">⚠️</span>
      <span>{error}</span>
    </div>
  )
}

export default OrderErrorBanner
