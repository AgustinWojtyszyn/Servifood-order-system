import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNoticeId } from './noticeHostIds'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(currentDir, 'NoticeHost.jsx'), 'utf8')
const originalCrypto = globalThis.crypto

const setCrypto = (value) => {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value
  })
}

describe('NoticeHost accessibility wiring', () => {
  it('moves focus to the close button when a notice is visible', () => {
    expect(source).toContain('const closeButtonRef = useRef(null)')
    expect(source).toContain('closeButtonRef.current?.focus()')
    expect(source).toContain('ref={closeButtonRef}')
  })

  it('closes on Escape and cleans up the keydown listener', () => {
    expect(source).toContain("window.addEventListener('keydown', handleKeyDown)")
    expect(source).toContain("event.key === 'Escape'")
    expect(source).toContain('setNotice(null)')
    expect(source).toContain("window.removeEventListener('keydown', handleKeyDown)")
  })

  it('restores the previous focus only while the previous element is still connected', () => {
    expect(source).toContain('previousFocusRef.current = document.activeElement')
    expect(source).toContain('previousFocus?.isConnected')
    expect(source).toContain("typeof previousFocus.focus === 'function'")
    expect(source).toContain('previousFocus.focus()')
  })

  it('associates the dialog with its title and message', () => {
    expect(source).toContain('aria-modal="true"')
    expect(source).toContain('aria-labelledby={titleId}')
    expect(source).toContain('aria-describedby={messageId}')
    expect(source).toContain('id={titleId}')
    expect(source).toContain('id={messageId}')
  })
})

describe('createNoticeId', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setCrypto(originalCrypto)
  })

  it('uses crypto.randomUUID when it is available', () => {
    setCrypto({ randomUUID: () => 'uuid-from-crypto' })

    expect(createNoticeId()).toBe('uuid-from-crypto')
  })

  it('uses a local fallback when crypto.randomUUID is unavailable', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456)
    vi.spyOn(Math, 'random').mockReturnValue(0.987654321)
    setCrypto(undefined)

    expect(createNoticeId()).toMatch(/^notice-123456-[a-z0-9]+$/)
  })

  it('keeps fallback IDs distinct across rapid calls when randomness changes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456)
    const randomSpy = vi.spyOn(Math, 'random')
    randomSpy.mockReturnValueOnce(0.111111111)
    randomSpy.mockReturnValueOnce(0.222222222)
    setCrypto({})

    expect(createNoticeId()).not.toBe(createNoticeId())
  })
})
