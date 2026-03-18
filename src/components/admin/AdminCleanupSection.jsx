import { AlertTriangle, Database, Settings, Trash2 } from 'lucide-react'

const AdminCleanupSection = ({
  archivingPending,
  archivedOrdersCount,
  deletingOrders,
  onArchiveAllPendingOrders,
  onDeleteArchivedOrders
}) => (
  <div className="space-y-6">
    <div className="card bg-linear-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-xl">
      <div className="flex items-start gap-4">
        <div className="shrink-0 p-3 bg-yellow-400 rounded-full">
          <AlertTriangle className="h-8 w-8 text-yellow-900" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-yellow-900 mb-2">⚠️ Recordatorio Importante</h3>
          <div className="text-yellow-800 space-y-2 leading-relaxed">
            <p className="font-semibold">
              Recordá limpiar regularmente los pedidos archivados para ahorrar recursos en Supabase.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Los pedidos archivados ocupan espacio en la base de datos</li>
              <li>Se recomienda limpiar al final de cada día o semana</li>
              <li>Esta acción es <strong>irreversible</strong> - los datos no se pueden recuperar</li>
              <li>Solo se eliminan pedidos con estado "Archivado"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div className="card bg-white/95 backdrop-blur-sm shadow-xl border-2 border-white/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl">
          <Database className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Limpiar Cache</h2>
          <p className="text-gray-600 mt-1">Libera espacio eliminando pedidos finalizados</p>
        </div>
      </div>

      <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border-2 border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pedidos Archivados</p>
                <p className="text-3xl sm:text-4xl font-bold text-blue-600">
                  {archivedOrdersCount}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Database className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Listos para eliminar
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Espacio Estimado</p>
                <p className="text-3xl sm:text-4xl font-bold text-green-600">
                  ~{(archivedOrdersCount * 2).toFixed(1)}KB
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Trash2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              A liberar aproximadamente
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={onArchiveAllPendingOrders}
          disabled={archivingPending}
          className={`w-full py-3 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 mb-2
            ${archivingPending
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-linear-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'}
          `}
          title="Archivar todos los pedidos pendientes (de hoy y días anteriores)"
        >
          {archivingPending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
              Archivando pedidos pendientes...
            </>
          ) : (
            <>
              <Trash2 className="h-5 w-5" />
              Archivar todos los pedidos pendientes
            </>
          )}
        </button>
        <div className="text-xs text-yellow-700 text-center mt-1">
          <strong>¿Qué hace este botón?</strong><br />
          Archiva todos los pedidos con estado <b>pendiente</b> (de hoy y días anteriores).<br />
          Los pedidos archivados no se eliminan, pero ya no aparecerán como pendientes ni podrán ser modificados.<br />
          Úsalo para limpiar la lista de pendientes y mantener el historial ordenado.
        </div>
      </div>
      {archivedOrdersCount > 0 ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Database className="h-5 w-5" />
              ¿Qué se eliminará?
            </h4>
            <ul className="text-blue-800 space-y-1 text-sm ml-7">
              <li>• {archivedOrdersCount} pedidos con estado "Archivado"</li>
              <li>• Información de items y opciones personalizadas</li>
              <li>• Timestamps y datos asociados</li>
            </ul>
          </div>

          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
            <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              ¡Atención! Acción Irreversible
            </h4>
            <p className="text-red-800 text-sm leading-relaxed">
              Una vez eliminados, los pedidos archivados <strong>no se pueden recuperar</strong>.
              Asegúrate de haber exportado o guardado cualquier información importante antes de proceder.
            </p>
          </div>

          <button
            onClick={onDeleteArchivedOrders}
            disabled={deletingOrders}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              deletingOrders
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
            }`}
          >
            {deletingOrders ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-6 w-6" />
                Eliminar {archivedOrdersCount} Pedidos Archivados
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <Database className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">✨ Todo Limpio</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            No hay pedidos archivados para eliminar en este momento.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg text-green-700 font-semibold">
            <span className="text-2xl">✓</span>
            Base de datos optimizada
          </div>
        </div>
      )}
    </div>

    <div className="card bg-linear-to-br from-purple-50 to-blue-50 border-2 border-purple-300">
      <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
        <Settings className="h-6 w-6" />
        💡 Mejores Prácticas
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-purple-800">
        <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
          <h4 className="font-bold mb-2">🕐 Frecuencia Recomendada</h4>
          <p className="text-sm leading-relaxed">
            Limpia los pedidos archivados una vez por semana o cuando acumules más de 100 pedidos.
          </p>
        </div>
        <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
          <h4 className="font-bold mb-2">📊 Antes de Eliminar</h4>
          <p className="text-sm leading-relaxed">
            Considera exportar reportes o estadísticas importantes desde la sección de Pedidos.
          </p>
        </div>
        <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
          <h4 className="font-bold mb-2">💾 Ahorro de Recursos</h4>
          <p className="text-sm leading-relaxed">
            Mantener la base de datos limpia mejora el rendimiento y reduce costos en Supabase.
          </p>
        </div>
        <div className="bg-white/60 rounded-lg p-4 border border-purple-200">
          <h4 className="font-bold mb-2">🔄 Automatización</h4>
          <p className="text-sm leading-relaxed">
            En el futuro se podría implementar limpieza automática programada.
          </p>
        </div>
      </div>
    </div>
  </div>
)

export default AdminCleanupSection
