# Unlighthouse — preparación del proyecto

## Estado

- Implementado: selectores estables para login (`input[name="email"]`, `input[name="password"]`, `button[type="submit"]`).
- Implementado: redirección post-login consistente a `/dashboard` (o `next` válido).
- Implementado: persistencia de sesión Supabase (`persistSession: true`, `storageKey: sb-servifood-auth`).
- Implementado: rutas críticas definidas en `unlighthouse.config.mjs`.
- Implementado: helper de autenticación para crawler en `testing/unlighthouse/auth-login.mjs`.

## Rutas críticas para análisis

- `/`
- `/login`
- `/dashboard`
- `/order`
- `/admin`
- `/daily-orders`
- `/monthly-panel`

## Datos de prueba (login)

Si no existe un usuario válido para auditoría, crear usuarios de prueba:

```bash
cp .env.example .env
TEST_USERS_COUNT=10 node testing/create-test-users.js
```

Credencial por defecto del script:

- Email: `test.user1@servifood.test`
- Password: `Test123!@#`

Para rutas admin (`/admin`), usar un usuario con rol `admin`.

## Ejecución base de Unlighthouse

```bash
npm run audit:unlighthouse
```

o

```bash
npx unlighthouse --config-file unlighthouse.config.mjs
```

## Autenticación automatizada (crawler)

El helper `testing/unlighthouse/auth-login.mjs` permite login por formulario usando selectores estables.

Variables esperadas:

- `UNLIGHTHOUSE_SITE`
- `UNLIGHTHOUSE_AUTH_EMAIL`
- `UNLIGHTHOUSE_AUTH_PASSWORD`

Ejemplo de uso dentro de un script de navegador:

```js
import loginWithForm from './testing/unlighthouse/auth-login.mjs'
await loginWithForm(page)
```

## Nota de estabilidad

- `RequireUser` ahora redirige a `/login` cuando no hay usuario y `loading` terminó, evitando spinner indefinido.
- No se modificó lógica de pedidos ni estados operativos (`pending`, `archived`).
