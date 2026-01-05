// Motor de reglas determinístico basado en palabras clave

const KEYWORDS = {
  errores: ['no pude', 'no me deja', 'error', 'falló', 'fallo', 'no funciona', 'no carga'],
  ayuda: ['no sé', 'nose', 'cómo', 'como', 'ayuda', 'tutorial', 'explicame', 'explicame'],
  pedidos: ['hacer pedido', 'confirmar pedido', 'cancelar pedido', 'pedido']
}

export const matchIntent = (text) => {
  const t = (text || '').toLowerCase()
  // Prioridad: errores > pedidos > ayuda
  if (KEYWORDS.errores.some(k => t.includes(k))) return 'errores'
  if (KEYWORDS.pedidos.some(k => t.includes(k))) return 'pedidos'
  if (KEYWORDS.ayuda.some(k => t.includes(k))) return 'ayuda'
  return 'general'
}

// Respuestas por intención
export const getResponseForIntent = (intent, { screenContext, SUPPORT_PHONE, TUTORIAL_URL, MANUAL_ORDER_TEXT }) => {
  switch (intent) {
    case 'errores':
      return {
        intent,
        title: 'Detectamos que estás teniendo un problema',
        message: 'Te guiamos paso a paso para resolverlo y, si no se puede completar, te decimos cómo derivarlo.',
        steps: [
          'Verificá tu conexión a Internet y reintentá la acción.',
          'Si es un formulario, revisá que todos los campos requeridos estén completos.',
          'Si aparece un error del servidor, esperá unos segundos y probá nuevamente.'
        ],
        tutorialUrl: TUTORIAL_URL,
        contact: SUPPORT_PHONE,
        requiredPhrase: MANUAL_ORDER_TEXT,
      }
    case 'pedidos':
      return {
        intent,
        title: 'Ayuda con tu pedido',
        message: 'Te indicamos cómo realizar, confirmar o cancelar tu pedido correctamente.',
        steps: [
          'Para realizar un pedido, ingresá a la pantalla de “Nuevo Pedido” y completá tus datos.',
          'Para confirmar, revisá el resumen y tocá “Confirmar Pedido”.',
          'Para cancelar dentro de los 15 minutos, usá la opción “Cancelar Pedido” en tu panel.'
        ],
        tutorialUrl: TUTORIAL_URL,
        contact: SUPPORT_PHONE,
        // Si no puede realizarse (por validación o restricción), la UI que consume este objeto debe mostrar la frase obligatoria.
        requiredPhrase: MANUAL_ORDER_TEXT,
      }
    case 'ayuda':
      return {
        intent,
        title: 'Te explicamos cómo usar la aplicación',
        message: 'Mirá el tutorial o seguí estos pasos:',
        steps: [
          'Elegí ubicación y menú.',
          'Completá tus datos y validá que no haya errores.',
          'Confirmá y verificá el estado en el panel.'
        ],
        tutorialUrl: TUTORIAL_URL,
        contact: SUPPORT_PHONE,
      }
    default:
      return {
        intent: 'general',
        title: 'Centro de Ayuda',
        message: 'Contanos qué necesitás. Podemos ayudarte con pedidos, errores y tutoriales.',
        steps: ['Escribí tu consulta en el campo de texto.'],
        tutorialUrl: TUTORIAL_URL,
        contact: SUPPORT_PHONE,
      }
  }
}

// Respuestas por código de error
export const getErrorResponse = (errorCode, { screenContext, SUPPORT_PHONE, TUTORIAL_URL, MANUAL_ORDER_TEXT }) => {
  switch (errorCode) {
    case 'VALIDATION_ERROR':
      return {
        intent: 'errores',
        title: 'Faltan datos o hay errores de validación',
        message: 'Revisá los campos marcados y corregilos para continuar.',
        steps: ['Completá campos obligatorios', 'Verificá formatos (email/teléfono)', 'Reintentá el envío'],
        tutorialUrl: TUTORIAL_URL,
        contact: SUPPORT_PHONE,
      }
    case 'TIME_RESTRICTION':
      return {
        intent: 'errores',
        title: 'Horario de pedidos cerrado',
        message: 'Los pedidos se realizan de 9:00 a 22:00 del día anterior.',
        steps: ['Intentá nuevamente dentro del horario habilitado'],
        tutorialUrl: TUTORIAL_URL,
        contact: SUPPORT_PHONE,
        requiredPhrase: MANUAL_ORDER_TEXT,
      }
    case 'NETWORK_ERROR':
      return {
        intent: 'errores',
        title: 'Problema de conexión',
        message: 'Tu dispositivo no pudo conectarse. Verificá Internet y probá otra vez.',
        steps: ['Comprobá Wi-Fi/datos', 'Refrescá la página', 'Intentá más tarde'],
        tutorialUrl: TUTORIAL_URL,
        contact: SUPPORT_PHONE,
      }
    case 'SERVER_ERROR':
      return {
        intent: 'errores',
        title: 'Error del servidor',
        message: 'Nuestro servidor devolvió un error. Estamos revisando.',
        steps: ['Esperá unos segundos y reintentá', 'Si persiste, avisá por el canal de ayuda'],
        tutorialUrl: TUTORIAL_URL,
        contact: SUPPORT_PHONE,
      }
    case 'ORDER_NOT_ALLOWED':
      return {
        intent: 'errores',
        title: 'No podés realizar el pedido en este momento',
        message: 'Por reglas del sistema o tu perfil, el pedido no puede completarse ahora.',
        steps: ['Revisá tu estado en el perfil', 'Intentá nuevamente más tarde'],
        tutorialUrl: TUTORIAL_URL,
        contact: SUPPORT_PHONE,
        requiredPhrase: MANUAL_ORDER_TEXT,
      }
    default:
      return {
        intent: 'errores',
        title: 'Ocurrió un problema',
        message: 'Te ayudamos a resolverlo o derivarlo.',
        steps: ['Reintentá la acción', 'Si persiste, usá el canal de ayuda'],
        tutorialUrl: TUTORIAL_URL,
        contact: SUPPORT_PHONE,
      }
  }
}
