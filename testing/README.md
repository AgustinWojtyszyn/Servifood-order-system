# 🧪 Pruebas de carga — guía (alineada con el repo)

## Estado del documento

- Implementado: scripts Node para crear usuarios, ejecutar carga y monitorear.
- Implementado: scripts npm en la raíz (`npm run test:load|test:light|test:medium|test:heavy`).
- Parcial: `testing/start-test.sh` existe pero está desalineado (invoca scripts npm que no existen en `package.json`).

---

## 📁 Qué hay en `testing/`

- `testing/create-test-users.js` → crea usuarios reales en Supabase Auth (requiere `SUPABASE_SERVICE_ROLE_KEY`).
- `testing/load/test-load.js` → runner principal de carga (lo usan los scripts `npm run test:*`).
- `testing/load-test.js` → script alternativo/legacy (no es el que usa `package.json`).
- `testing/monitor.js` → monitor por polling (requiere `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
- `testing/scripts/setup-env.sh` → asistente para crear `.env` (solo VITE vars + parámetros opcionales).
- `testing/start-test.sh` → asistente interactivo (estado: parcial / desalineado).

---

## ✅ Requisitos

En `.env` (en la raíz del repo):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo si vas a usar `testing/create-test-users.js`)

Podés partir de:

```bash
cp .env.example .env
```

---

## 🚀 Uso recomendado

### 1) Crear usuarios de prueba

```bash
TEST_USERS_COUNT=100 node testing/create-test-users.js
```

### 2) Ejecutar load test

```bash
npm run test:light
npm run test:medium
npm run test:heavy
```

O directo:

```bash
node testing/load/test-load.js 10 5
```

### 3) (Opcional) Monitor

```bash
node testing/monitor.js
```

---

## 🧪 Troubleshooting

### “Faltan variables de entorno”

- Verifica que `.env` esté en la raíz.
- Verifica `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Para crear usuarios: verifica `SUPABASE_SERVICE_ROLE_KEY`.

### `testing/start-test.sh` falla

Estado: **Parcial**. Hoy invoca scripts npm que no existen en `package.json`. Usar en su lugar los comandos de “Uso recomendado”.

---

**Última actualización de este doc:** 2026-04-16

