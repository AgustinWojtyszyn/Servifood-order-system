const AdminDetailsModal = ({
  open,
  loading,
  onCancel,
  onConfirm
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-6">
      <div className="mt-6 sm:mt-10 bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-red-200">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Deshabilitar postre</h3>
        <p className="text-sm text-gray-700 mb-4">
          ¿Seguro que deseas deshabilitar el postre para la fecha seleccionada? Los usuarios dejarán de ver la opción.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 shadow-sm disabled:opacity-50"
          >
            Sí, deshabilitar
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDetailsModal
