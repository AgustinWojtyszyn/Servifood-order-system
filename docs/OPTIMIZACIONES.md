# 🚀 Optimizaciones de rendimiento — estado real (alineado con el código)

## Estado del documento

- Implementado: build optimizado en `vite.config.js` (Terser, chunks manuales, sourcemap false, assetsInlineLimit).
- Implementado: lazy loading de varias rutas en `src/App.jsx` (no incluye `AdminPanel`).
- Implementado: cache simple en memoria en `src/supabaseClient.js` (TTL default 30s).
- Parcial: optimización de queries (hay `select('*')` en algunas consultas).
- Ejemplo/No verificado: tamaños exactos de bundles, compresión gzip “del build”, métricas de RPS/latencias.

---

## Implementado — Build (Vite)

Configuración relevante (ver `vite.config.js`):

- `build.minify = 'terser'`
- `terserOptions.compress.drop_console = true` + `pure_funcs` para `console.*`
- `rollupOptions.output.manualChunks` (`react-vendor`, `supabase-vendor`, `ui-vendor`)
- `build.sourcemap = false`
- `build.assetsInlineLimit = 4096`

## Implementado — Lazy loading de rutas

En `src/App.jsx` se usa `React.lazy` para cargar diferido rutas/páginas como:

- Register, ForgotPassword, ResetPassword, AuthCallback
- Dashboard, DailyOrders, OrderCompanySelector
- OrderForm, EditOrderForm, Profile
- MonthlyPanel, AuditLogs, OrderDetails
- Páginas de cafetería y Tendencias

Eager (no-lazy) en el código actual: `Layout`, `Login`, `LandingPage`, `AdminPanel`, hosts de notice/confirm.

## Implementado — Cache en memoria

En `src/supabaseClient.js` existe un cache simple con TTL:

- TTL por defecto: 30s (ver `cache.set(key, value, ttlMs = 30000)`).
- Se invalida en algunas operaciones de escritura (se pasa `invalidateCache` a servicios).

## Parcial — Optimización de queries

No toda la app usa selects específicos: existen consultas con `select('*')` en el código.

---

## 📋 Checklist de producción (realista)

- [x] Minificación habilitada (Terser)
- [x] Code splitting configurado (manualChunks)
- [x] Sourcemaps desactivados en build
- [x] Lazy loading de rutas (parcial)
- [x] Cache en memoria (parcial)
- [ ] Compresión gzip/brotli (depende del hosting/servidor)
- [ ] Service Worker / offline PWA (no implementado)

## 🚀 Comandos útiles (repo)

```bash
npm run build
npm run preview
npm run build:analyze
npm run test:light
npm run test:medium
npm run test:heavy
npm run check:optimizations
```

---

**Última actualización de este doc:** 2026-04-16
