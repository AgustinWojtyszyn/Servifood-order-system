const site = process.env.UNLIGHTHOUSE_SITE || 'http://localhost:4173'

const urls = [
  '/',
  '/login',
  '/dashboard',
  '/order',
  '/admin',
  '/daily-orders',
  '/monthly-panel'
]

export default {
  site,
  urls,
  scanner: {
    device: 'desktop',
    samples: 1
  }
}
