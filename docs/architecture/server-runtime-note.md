# server.js runtime note

## Estado actual

El archivo `server.js` existe en el repositorio, pero no forma parte del flujo de deploy actual.

### Evidencia
- `render.yaml` construye con `npm run build`
- `render.yaml` sirve la app con `npx serve -s dist`
- `package.json` no tiene scripts que ejecuten `server.js`

## Observación importante

Dentro de `server.js` existe un import hacia:

```js
./sendDailyOrdersEmail.js
