export default function RequireUser({ user, loading, children }) {
  if (loading || !user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
          <p className="text-white font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
