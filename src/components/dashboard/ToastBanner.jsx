const ToastBanner = ({ toast }) => {
  if (!toast) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md">
      <div
        className={`rounded-2xl shadow-2xl px-4 py-3 text-sm sm:text-base font-semibold text-white border border-white/20 ${
          toast.variant === 'error'
            ? 'bg-linear-to-r from-rose-600 to-red-700'
            : 'bg-linear-to-r from-blue-800 to-blue-900'
        }`}
      >
        {toast.message}
      </div>
    </div>
  )
}

export default ToastBanner
