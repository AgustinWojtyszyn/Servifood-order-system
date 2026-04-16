# 📱 Optimizaciones móviles — estado real (alineado con el código)

## Estado del documento

- Implementado: meta tags móviles y PWA manifest linkeado en `index.html`.
- Implementado: estilos base móviles en `src/mobile-optimizations.css` importados en `src/main.jsx`.
- Parcial: PWA “instalable” (manifest) sin Service Worker/offline.
- Parcial: safe-area (hay utilidades CSS, pero no se habilita globalmente por clase).

---

## Implementado — Meta tags móviles (`index.html`)

Viewport real:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

iOS:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="ServiFood" />
<link rel="apple-touch-icon" href="/src/assets/servifood logo.jpg" />
```

Android:

```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="theme-color" content="#1e3a8a" />
```

## Parcial — PWA (`public/manifest.json`)

- Implementado: `index.html` tiene `<link rel="manifest" href="/manifest.json" />`.
- Implementado: `public/manifest.json` existe.
- No implementado: Service Worker/offline.

Resumen del manifest real:

```json
{
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#1e3a8a",
  "background_color": "#1e3a8a"
}
```

## Implementado — CSS móvil (`src/mobile-optimizations.css`)

Incluye, entre otras, estas optimizaciones:

- Prevención de auto-zoom iOS en inputs (font-size 16px).
- Área táctil mínima para botones/links.
- Scroll suave (`-webkit-overflow-scrolling: touch`) y `overflow-x` bloqueado.
- Feedback táctil (`:active`).
- Breakpoints de tipografía y espaciado.

Importación: `src/main.jsx` importa `./mobile-optimizations.css`.

## Parcial — Utilidades que requieren adopción en UI

Existen utilidades como:

- `.modal` / `.dialog` (full-screen en mobile)
- `.min-h-screen-mobile`
- `body.use-safe-area` (safe-area global)

Estado: **Parcial** porque requieren clases concretas en el markup; este repo no aplica `body.use-safe-area` globalmente.

---

## 🧪 Testing en móviles (checklist)

- [ ] iOS Safari / Chrome iOS
- [ ] Android Chrome / Samsung Internet
- [ ] Verificar inputs sin auto-zoom (iOS)
- [ ] Verificar botones con área táctil suficiente
- [ ] Verificar que no haya scroll horizontal
- [ ] Verificar que `/manifest.json` se sirva correctamente

---

## 🆘 Troubleshooting

### Auto-zoom en inputs (iOS)

Verificar que los inputs mantengan `font-size: 16px` (CSS ya existe en `src/mobile-optimizations.css`).

### Notch / safe-area

Si se necesita safe-area global vía CSS, hay reglas para `body.use-safe-area`, pero hay que aplicar esa clase en runtime.

---

**Última actualización de este doc:** 2026-04-16
