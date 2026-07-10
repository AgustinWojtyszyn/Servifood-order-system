export const createNoticeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `notice-${Date.now()}-${Math.random().toString(36).slice(2)}`
