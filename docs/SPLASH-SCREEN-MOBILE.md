# 📱 Pantalla de carga — estado real (alineado con el código)

## Estado del documento

- Implementado: loader HTML “fallback” en `index.html` (antes de React).
- Parcial: componente `src/components/SplashScreen.jsx` existe, pero no está conectado en el flujo actual de `src/App.jsx` (solo se importa).
- No implementado: splash HTML con barra/porcentaje como el que describía una versión anterior de este doc.

---

## Implementado — Loader HTML (index.html)

Hoy existe un loader simple previo a React:

```html
<div id="fallback-loader">
  <div class="spinner" aria-hidden="true"></div>
  <div>
    <div>Cargando ServiFood...</div>
    <div>Si esto tarda, intenta refrescar o revisa tu conexión.</div>
  </div>
</div>
```

Y un hook global para ocultarlo cuando React monta (`window.__servifood_loader_hide`), que se invoca desde `src/main.jsx`.

## Parcial — Componente React `SplashScreen.jsx`

Existe un componente con barra/porcentaje simulado:

- `src/components/SplashScreen.jsx`

Estado: **Parcial** porque no se renderiza actualmente desde `src/App.jsx`.

## 🧪 Testing (checklist)

- [ ] El loader HTML aparece antes de React.
- [ ] Al montar React, el loader se oculta.
- [ ] No queda un loader visible indefinidamente.

---

**Última actualización de este doc:** 2026-04-16

