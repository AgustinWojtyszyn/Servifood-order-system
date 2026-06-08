# server.js runtime note

## Estado actual

El archivo `server.js` existe en el repositorio, pero no forma parte del flujo de deploy actual.

### Evidencia
- `render.yaml` construye con `npm run build`
- `render.yaml` sirve la app con `npx serve -s dist`
- `package.json` no tiene scripts que ejecuten `server.js`

No agregar dependencias para `server.js` ni cambiar el deploy para ejecutarlo sin una decision explicita. Si se reactiva en el futuro, las claves privadas deben leerse solo desde variables backend como `SUPABASE_SERVICE_ROLE_KEY`; nunca desde variables con prefijo `VITE_`.

## Observacion importante

`server.js` conserva endpoints y middleware que no se usan en el deploy vigente. Tambien referencia dependencias que no estan declaradas en `package.json`; eso es aceptable mientras el archivo siga fuera del runtime real. Si se decide reactivarlo, primero hay que auditarlo como backend activo y declarar solo las dependencias necesarias.
