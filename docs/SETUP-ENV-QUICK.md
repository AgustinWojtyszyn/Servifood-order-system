# 🚀 Inicio Rápido: Configurar Pruebas de Carga

## Estado del documento

- Implementado: scripts de carga `npm run test:*` y lectura de `.env`.
- Implementado: script `testing/scripts/setup-env.sh` (crea `.env` en la raíz).
- No implementado: `./setup-env.sh` en la raíz (no existe).

---

## ❌ Error típico

```
Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
```

## ✅ Solución (opción A o B)

### Opción A: Script automático (recomendado)

Desde la raíz del repo:

```bash
chmod +x testing/scripts/setup-env.sh
./testing/scripts/setup-env.sh
```

### Opción B: Manual

1) Crea `.env` en la raíz:

```bash
nano .env
```

2) Pega (reemplaza valores):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# (Opcional) parámetros de tests de carga
TEST_USERS_COUNT=100
CONCURRENT_USERS=50
ORDERS_PER_USER=3
DELAY_MS=500
USER_DELAY_MS=100
```

## 🔑 ¿Dónde obtener credenciales?

### Implementado — Supabase Dashboard

1. Supabase Dashboard → tu proyecto
2. Settings → API
3. Copia:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

### Ejemplo — Variables del host (Render, etc.)

Si ya desplegaste, tu proveedor suele mostrar variables de entorno del servicio. Copia las que empiecen por `VITE_SUPABASE_`.

## ✅ Verificar que funcionó

```bash
ls -la .env
npm run test:light
```

## 🔒 Seguridad

- ✅ `.env` es para uso local (no lo subas a Git).
- ❌ No compartas el contenido de `.env` públicamente.

## 🆘 Troubleshooting

### No se encuentra `.env`

```bash
pwd
ls -la .env
```

### Variables no se cargan

```bash
cat .env | head -20
```

Verifica que no haya espacios alrededor del `=`.

## 📚 Más ayuda

- Guía completa de carga: `docs/TEST-LOAD-README.md`
- Ejemplo de variables: `.env.example`
