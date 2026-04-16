# 🎯 Inicio rápido — Pruebas de carga (alineado con el repo)

## Estado del documento

- Implementado: scripts de load test disponibles vía `package.json` (`npm run test:light|medium|heavy`).
- Implementado: script para crear usuarios de prueba `testing/create-test-users.js`.
- Implementado: runner principal `testing/load/test-load.js`.
- Parcial: `testing/start-test.sh` existe pero está desalineado (invoca scripts npm que no existen en `package.json`).

---

## 1) Configurar `.env`

Desde la raíz del repo:

```bash
cp .env.example .env
```

Completar como mínimo:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (necesario para crear usuarios de prueba)

> Opcional: `testing/scripts/setup-env.sh` te ayuda a crear `.env`, pero no configura `SUPABASE_SERVICE_ROLE_KEY`.

## 2) Instalar dependencias

```bash
npm install
```

## 3) Crear usuarios de prueba

```bash
TEST_USERS_COUNT=100 node testing/create-test-users.js
```

## 4) Ejecutar prueba de carga

Opción A (scripts del repo):

```bash
npm run test:light
npm run test:medium
npm run test:heavy
```

Opción B (parámetros directos):

```bash
node testing/load/test-load.js 10 5
```

## 5) (Opcional) Monitor

```bash
node testing/monitor.js
```

Nota: el monitor muestra distribución por `status`. Si tus estados reales no incluyen categorías como “processing/completed/delivered”, los porcentajes/labels pueden no representar tu flujo actual.

---

## Nota sobre `testing/start-test.sh`

`testing/start-test.sh` existe, pero hoy invoca scripts como `npm run test:load-light`/`npm run monitor` que no están en `package.json`.  
Estado: **Parcial** (no recomendado hasta alinearlo).

---

**Última actualización de este doc:** 2026-04-16

