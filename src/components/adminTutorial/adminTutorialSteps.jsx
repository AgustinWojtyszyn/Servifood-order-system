import { Users, ChefHat, Settings, Eye, CheckCircle, Bell, MessageCircle } from 'lucide-react'

export const ADMIN_TUTORIAL_STEPS = [
  {
    title: '¡Bienvenido al Panel de Administración! 👨‍💼',
    icon: Users,
    content: (
      <div className="space-y-4">
        <p className="text-lg text-gray-700 leading-relaxed">
          Como <strong>administrador</strong>, tienes acceso completo a todas las funcionalidades de ServiFood Catering.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <h4 className="font-bold text-blue-900 mb-2">Tus privilegios incluyen:</h4>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Ver <strong>todos los pedidos</strong> de todos los usuarios</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Gestionar <strong>usuarios</strong> y asignar roles</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Modificar el <strong>menú</strong> diario</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Crear <strong>opciones personalizadas</strong> y encuestas</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <span>Cambiar <strong>estados de pedidos</strong></span>
            </li>
          </ul>
        </div>
      </div>
    )
  },
  {
    title: 'Dashboard - Vista de Administrador 📊',
    icon: Eye,
    content: (
      <div className="space-y-4">
        <p className="text-lg text-gray-700 leading-relaxed">
          En el Dashboard, verás información privilegiada que los usuarios normales no pueden ver:
        </p>
        <div className="space-y-3">
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Nombres de Usuarios
            </h4>
            <p className="text-purple-800">
              Cada pedido muestra el <strong>nombre completo</strong> del usuario que lo hizo.
              Ejemplo: <span className="bg-purple-200 px-2 py-1 rounded">Juan Pérez - Pedido #ABC12345</span>
            </p>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Botón "Ver Detalles"
            </h4>
            <p className="text-green-800">
              Haz clic en el icono del <strong>ojo 👁️</strong> para ver toda la información del pedido:
            </p>
            <ul className="mt-2 ml-4 space-y-1 text-green-700">
              <li>• Datos del cliente (email, teléfono)</li>
              <li>• Platillos ordenados con cantidades</li>
              <li>• Respuestas a opciones personalizadas</li>
              <li>• Comentarios y observaciones</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-yellow-900 mb-2">Pedidos Completados</h4>
            <p className="text-yellow-800">
              Tienes acceso a la sección de <strong>"Pedidos Completados"</strong> donde puedes revisar el historial completo.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: 'Gestión de Estados de Pedidos ⚡',
    icon: CheckCircle,
    content: (
      <div className="space-y-4">
        <p className="text-lg text-gray-700 leading-relaxed">
          Como admin, puedes cambiar el estado de cualquier pedido directamente desde el Dashboard:
        </p>

        <div className="bg-linear-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 p-4 rounded-lg">
          <h4 className="font-bold text-yellow-900 mb-3 text-lg">Estados Disponibles:</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                Pendiente
              </span>
              <p className="text-yellow-900">Pedido recién creado, esperando preparación.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                Completado
              </span>
              <p className="text-yellow-900">Pedido preparado y entregado. El usuario recibirá una <strong>notificación automática</strong>.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                Cancelado
              </span>
              <p className="text-yellow-900">Pedido cancelado por algún motivo.</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            ¡Importante! Notificaciones Automáticas
          </h4>
          <p className="text-blue-800">
            Cuando marcas un pedido como <strong>"Completado"</strong>, el usuario recibe automáticamente:
          </p>
          <ul className="mt-2 ml-4 space-y-1 text-blue-700">
            <li>• Una notificación en la campana 🔔</li>
            <li>• Una notificación del navegador (si está permitido)</li>
            <li>• El pedido desaparece de su vista</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    title: 'Panel de Administración 🎛️',
    icon: Settings,
    content: (
      <div className="space-y-4">
        <p className="text-lg text-gray-700 leading-relaxed">
          Accede al <strong>Panel Admin</strong> desde el menú lateral. Aquí encontrarás 3 pestañas principales:
        </p>

        <div className="space-y-3">
          <div className="bg-indigo-50 border-2 border-indigo-300 p-4 rounded-lg">
            <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2 text-lg">
              <Users className="h-6 w-6" />
              1. Gestión de Usuarios
            </h4>
            <ul className="space-y-2 text-indigo-800">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                Ver todos los usuarios registrados
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                Cambiar roles (Usuario ↔️ Administrador)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                Eliminar usuarios (⚠️ también elimina sus pedidos)
              </li>
            </ul>
          </div>

          <div className="bg-orange-50 border-2 border-orange-300 p-4 rounded-lg">
            <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2 text-lg">
              <ChefHat className="h-6 w-6" />
              2. Gestión del Menú
            </h4>
            <ul className="space-y-2 text-orange-800">
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                Editar items del menú diario
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                Agregar nuevos platillos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                Eliminar platillos del día
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                Incluir descripciones atractivas
              </li>
            </ul>
          </div>

          <div className="bg-purple-50 border-2 border-purple-300 p-4 rounded-lg">
            <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2 text-lg">
              <Settings className="h-6 w-6" />
              3. Opciones Personalizadas
            </h4>
            <ul className="space-y-2 text-purple-800">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                Crear encuestas y preguntas para pedidos
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                3 tipos: Opción múltiple, Checkbox, Texto libre
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                Marcar como obligatorias o opcionales
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                Reordenar con flechas ⬆️⬇️
              </li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    title: 'Opciones Personalizadas - Detalle 🎨',
    icon: Settings,
    content: (
      <div className="space-y-4">
        <p className="text-lg text-gray-700 leading-relaxed">
          Las <strong>Opciones Personalizadas</strong> te permiten recopilar información adicional en cada pedido:
        </p>

        <div className="space-y-3">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-blue-900 mb-2">📝 Tipo: Opción Múltiple</h4>
            <p className="text-blue-800 mb-2">
              El usuario debe elegir <strong>UNA</strong> opción de una lista.
            </p>
            <p className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
              Ejemplo: "¿Prefieres alguna bebida?" → Agua, Jugo, Coca Cola, Ninguna
            </p>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-green-900 mb-2">☑️ Tipo: Checkbox</h4>
            <p className="text-green-800 mb-2">
              El usuario puede seleccionar <strong>VARIAS</strong> opciones.
            </p>
            <p className="text-sm text-green-700 bg-green-100 p-2 rounded">
              Ejemplo: "Preferencias adicionales" → Sin cebolla, Sin ajo, Extra picante
            </p>
          </div>

          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
            <h4 className="font-bold text-purple-900 mb-2">✍️ Tipo: Texto Libre</h4>
            <p className="text-purple-800 mb-2">
              El usuario escribe su respuesta libremente.
            </p>
            <p className="text-sm text-purple-700 bg-purple-100 p-2 rounded">
              Ejemplo: "¿Tienes alguna alergia alimentaria?"
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg mt-4">
          <h4 className="font-bold text-yellow-900 mb-2">💡 Consejo Pro:</h4>
          <p className="text-yellow-800">
            Puedes <strong>activar/desactivar</strong> opciones temporalmente sin eliminarlas. Usa el toggle verde/gris.
          </p>
        </div>
      </div>
    )
  },
  {
    title: 'Privacidad y Seguridad 🔒',
    icon: Eye,
    content: (
      <div className="space-y-4">
        <p className="text-lg text-gray-700 leading-relaxed">
          El sistema tiene diferentes niveles de acceso para proteger la privacidad:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 border-2 border-red-300 p-4 rounded-lg">
            <h4 className="font-bold text-red-900 mb-3 text-center">👤 Usuarios Normales</h4>
            <ul className="space-y-2 text-red-800 text-sm">
              <li className="flex items-start gap-2">
                <span>❌</span>
                <span>Solo ven sus propios pedidos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>❌</span>
                <span>Solo pedidos del día actual</span>
              </li>
              <li className="flex items-start gap-2">
                <span>❌</span>
                <span>NO ven nombres de otros</span>
              </li>
              <li className="flex items-start gap-2">
                <span>❌</span>
                <span>NO ven detalles completos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>❌</span>
                <span>Pedidos completados se ocultan</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border-2 border-green-300 p-4 rounded-lg">
            <h4 className="font-bold text-green-900 mb-3 text-center">👨‍💼 Administradores</h4>
            <ul className="space-y-2 text-green-800 text-sm">
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Ven TODOS los pedidos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Todas las fechas</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Nombres completos visibles</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Acceso a detalles completos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✅</span>
                <span>Historial completo</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-4">
          <h4 className="font-bold text-blue-900 mb-2">🔐 Seguridad en Base de Datos</h4>
          <p className="text-blue-800">
            Las políticas RLS (Row Level Security) garantizan que cada usuario solo pueda acceder a sus propios datos,
            incluso si intenta acceder directamente a la base de datos.
          </p>
        </div>
      </div>
    )
  },
  {
    title: 'Tips y Mejores Prácticas 💡',
    icon: MessageCircle,
    content: (
      <div className="space-y-4">
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 p-5 rounded-lg">
          <h4 className="font-bold text-blue-900 mb-3 text-xl">📌 Recomendaciones:</h4>

          <div className="space-y-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <h5 className="font-semibold text-gray-900 mb-1">1️⃣ Actualiza el menú diariamente</h5>
              <p className="text-gray-700 text-sm">
                Mantén el menú actualizado cada día para reflejar las opciones disponibles.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm">
              <h5 className="font-semibold text-gray-900 mb-1">2️⃣ Responde rápido a los pedidos</h5>
              <p className="text-gray-700 text-sm">
                Cambia el estado de "Pendiente" a "Completado" tan pronto como el pedido esté listo.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm">
              <h5 className="font-semibold text-gray-900 mb-1">3️⃣ Revisa las opciones personalizadas</h5>
              <p className="text-gray-700 text-sm">
                Antes de preparar un pedido, mira las respuestas a las opciones personalizadas (alergias, preferencias).
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm">
              <h5 className="font-semibold text-gray-900 mb-1">4️⃣ Usa el modal de detalles 👁️</h5>
              <p className="text-gray-700 text-sm">
                Haz clic en el ojo para ver toda la información del pedido antes de confirmarlo.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm">
              <h5 className="font-semibold text-gray-900 mb-1">5️⃣ Gestiona usuarios con cuidado</h5>
              <p className="text-gray-700 text-sm">
                Al eliminar un usuario, se eliminan también todos sus pedidos. Hazlo solo cuando sea necesario.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
          <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            ¿Necesitas ayuda?
          </h4>
          <p className="text-green-800">
            Si tienes dudas o problemas, puedes contactar soporte por WhatsApp:
            <strong className="ml-1">+54 264 440 5294</strong>
          </p>
        </div>

        <div className="bg-purple-50 border-2 border-purple-300 p-4 rounded-lg text-center">
          <p className="text-lg font-bold text-purple-900 mb-2">
            🎉 ¡Listo para administrar ServiFood Catering!
          </p>
          <p className="text-purple-700">
            Puedes volver a ver este tutorial desde el menú lateral en cualquier momento.
          </p>
        </div>
      </div>
    )
  }
]

