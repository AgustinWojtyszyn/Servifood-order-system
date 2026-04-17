/**
 * Helper de autenticación para crawlers basados en navegador (Playwright/Puppeteer).
 * Usa selectores estables del login:
 * - input[name="email"]
 * - input[name="password"]
 * - button[type="submit"]
 */
export async function loginWithForm(page, {
  baseUrl = process.env.UNLIGHTHOUSE_SITE || 'http://localhost:4173',
  email = process.env.UNLIGHTHOUSE_AUTH_EMAIL,
  password = process.env.UNLIGHTHOUSE_AUTH_PASSWORD
} = {}) {
  if (!email || !password) {
    throw new Error('Missing UNLIGHTHOUSE_AUTH_EMAIL or UNLIGHTHOUSE_AUTH_PASSWORD')
  }

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard(\?.*)?$/, { timeout: 15000 })
}

export default loginWithForm
