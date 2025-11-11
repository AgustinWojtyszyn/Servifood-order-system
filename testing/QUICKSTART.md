# 🎯 INICIO RÁPIDO - Pruebas de Carga ServiFood

## 🚀 Setup en 3 pasos

### 1️⃣ Configurar credenciales

```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita .env y agrega tus credenciales de Supabase
nano .env  # o usa tu editor favorito
```

**Necesitas agregar:**
- `VITE_SUPABASE_URL` - URL de tu proyecto
- `VITE_SUPABASE_ANON_KEY` - Anon key (público)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (Dashboard > Settings > API)

### 2️⃣ Crear usuarios de prueba

```bash
cd testing
node create-test-users.js
```

Esto crea 100 usuarios con:
- Emails: `test.user1@servifood.test` a `test.user100@servifood.test`
- Password: `Test123!@#` (todos tienen la misma)
- Roles: 10% admins, 90% usuarios

### 3️⃣ Ejecutar prueba de carga

```bash
# Opción fácil: usa el asistente
./start-test.sh

# O ejecuta directamente
npm run test:load-light    # 10 usuarios, 20 pedidos
npm run test:load-medium   # 50 usuarios, 250 pedidos
npm run test:load-heavy    # 200 usuarios, 2000 pedidos
```

## 📊 Ver resultados en tiempo real

```bash
npm run monitor
```

Muestra estadísticas actualizadas cada 2 segundos.

## 🎨 Estructura de archivos creados

```
food-order-app/
├── .env.example (actualizado)
├── generate-test-users.sql (script SQL)
├── generate-test-orders.sql (script SQL)
└── testing/
    ├── README.md (documentación completa)
    ├── QUICKSTART.md (este archivo)
    ├── package.json (scripts npm)
    ├── start-test.sh (asistente interactivo)
    ├── create-test-users.js (crear usuarios)
    ├── load-test.js (pruebas de carga)
    └── monitor.js (monitoreo en tiempo real)
```

## 💡 Comandos más usados

```bash
# Crear 200 usuarios
TEST_USERS_COUNT=200 node create-test-users.js

# Prueba personalizada
CONCURRENT_USERS=100 ORDERS_PER_USER=5 node load-test.js

# Ver actividad en vivo
npm run monitor
```

## 🧹 Limpiar datos de prueba

Ejecuta en Supabase SQL Editor:

```sql
DELETE FROM public.orders 
WHERE user_id IN (
  SELECT id FROM public.users WHERE email LIKE '%@servifood.test'
);

DELETE FROM auth.users WHERE email LIKE '%@servifood.test';
DELETE FROM public.users WHERE email LIKE '%@servifood.test';
```

## ❓ Problemas comunes

**Error: "Faltan variables de entorno"**
- Verifica que `.env` exista y tenga todas las variables

**Error: "No hay usuarios de prueba"**
- Ejecuta primero `create-test-users.js`

**Error de autenticación**
- Verifica el Service Role Key en `.env`
- Asegúrate que los usuarios existan en Supabase

## 📖 Documentación completa

Lee `README.md` para:
- Guía detallada de todos los scripts
- Escenarios de prueba recomendados
- Análisis de resultados
- Troubleshooting avanzado

---

**¿Listo para probar?** → `cd testing && ./start-test.sh`
