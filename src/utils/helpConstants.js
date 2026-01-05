// Constantes globales reutilizables para el Help Center
// Se pueden configurar vía variables de entorno Vite (VITE_SUPPORT_PHONE, VITE_TUTORIAL_URL)

export const SUPPORT_PHONE = (import.meta?.env?.VITE_SUPPORT_PHONE ?? '+54 264 440 5294')

export const TUTORIAL_URL = (import.meta?.env?.VITE_TUTORIAL_URL ?? 'https://servifood.example.com/tutorial')

// Frase obligatoria (plantilla). No formatear promesas de acción.
export const MANUAL_ORDER_TEXT =
  `Si no pudiste hacer el pedido, pedí que lo agreguen manualmente por el grupo de tu empresa o comunicate al número de ayuda que figura en pantalla: ${SUPPORT_PHONE}.`
