import { useHelpCenterContext } from '../contexts/HelpCenterProvider'

export default function useHelpCenter() {
  const { handleUserMessage, handleError, lastResponse, SUPPORT_PHONE, TUTORIAL_URL, MANUAL_ORDER_TEXT } = useHelpCenterContext()
  return { handleUserMessage, handleError, lastResponse, SUPPORT_PHONE, TUTORIAL_URL, MANUAL_ORDER_TEXT }
}
