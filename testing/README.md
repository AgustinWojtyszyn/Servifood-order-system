# 🧪 Guía de Pruebas de Carga para ServiFood

Esta carpeta contiene scripts para generar datos de prueba y simular carga en la aplicación ServiFood.

## 📋 Contenido

1. **Scripts SQL** (ejecutar en Supabase)
   - `generate-test-users.sql` - Genera datos para usuarios de prueba
   - `generate-test-orders.sql` - Genera pedidos masivos

2. **Scripts Node.js** (ejecutar localmente)
   - `create-test-users.js` - Crea usuarios reales usando la API de Supabase
   - `load-test.js` - Simula usuarios concurrentes interactuando con la app

## 🚀 Configuración Inicial

### 1. Instalar dependencias

Si aún no lo has hecho, asegúrate de tener las dependencias instaladas:

```bash
cd /home/aggustin/.vscode/food-order-app
npm install
```

### 2. Configurar variables de entorno

Crea o actualiza tu archivo `.env` con las siguientes variables:

```bash
# Variables existentes
VITE_SUPABASE_URL=tu-url-de-supabase
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Nueva variable necesaria para crear usuarios
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Opcionales (configuración de pruebas)
TEST_USERS_COUNT=100
CONCURRENT_USERS=50
ORDERS_PER_USER=3
DELAY_MS=500
USER_DELAY_MS=100
```

**¿Dónde conseguir el Service Role Key?**
- Ve a tu proyecto en Supabase
- Settings > API
- Copia el `service_role` key (⚠️ NO compartir nunca)

### 3. Instalar dotenv (si no está instalado)

```bash
npm install dotenv
```

## 📝 Uso de los Scripts

### Opción A: Crear usuarios con SQL (Solo datos, sin autenticación real)

1. Ve a Supabase Dashboard > SQL Editor
2. Copia y pega el contenido de `generate-test-users.sql`
3. Ejecuta la consulta:
   ```sql
   SELECT * FROM generate_test_users(50);
   ```

**Limitación:** Esto solo genera datos de muestra en la tabla, no crea usuarios reales que puedan hacer login.

### Opción B: Crear usuarios reales con Node.js ✅ RECOMENDADO

Este método crea usuarios que SÍ pueden hacer login:

```bash
# Crear 100 usuarios de prueba (por defecto)
node testing/create-test-users.js

# O especificar cantidad
TEST_USERS_COUNT=200 node testing/create-test-users.js
```

**Resultado:**
- Usuarios creados con patrón: `test.user[1-N]@servifood.test`
- Password para todos: `Test123!@#`
- ~10% serán administradores, 90% usuarios normales
- Los usuarios pueden hacer login inmediatamente

### Generar pedidos masivos con SQL

1. Ve a Supabase Dashboard > SQL Editor
2. Copia y pega el contenido de `generate-test-orders.sql`
3. Ejecuta la función:

```sql
-- Generar 500 pedidos
SELECT generate_test_orders(500) as pedidos_creados;

-- Ver estadísticas
SELECT 
  status,
  COUNT(*) as cantidad
FROM public.orders
GROUP BY status;
```

**Características:**
- Pedidos con datos realistas (ubicaciones, items, comentarios)
- Distribución de estados: 80% pending/processing, 15% completed/delivered, 5% cancelled
- Items variados del menú con cantidades aleatorias
- Fechas de creación en los últimos 30 días
- Fechas de entrega en los próximos 7 días

## 🔥 Pruebas de Carga - Usuarios Concurrentes

El script `load-test.js` simula usuarios reales interactuando con la aplicación:

### Uso básico

```bash
# Ejecutar con configuración por defecto
node testing/load-test.js
```

### Configuración avanzada

```bash
# 100 usuarios concurrentes, 5 pedidos cada uno
CONCURRENT_USERS=100 ORDERS_PER_USER=5 node testing/load-test.js

# Test intensivo: 200 usuarios, 10 pedidos cada uno
CONCURRENT_USERS=200 ORDERS_PER_USER=10 DELAY_MS=200 node testing/load-test.js

# Test rápido: 20 usuarios, 2 pedidos
CONCURRENT_USERS=20 ORDERS_PER_USER=2 node testing/load-test.js
```

### Variables de configuración

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `CONCURRENT_USERS` | Número de usuarios simultáneos | 50 |
| `ORDERS_PER_USER` | Pedidos que creará cada usuario | 3 |
| `DELAY_MS` | Milisegundos entre pedidos del mismo usuario | 500 |
| `USER_DELAY_MS` | Milisegundos entre inicio de cada usuario | 100 |

### Qué hace el script

1. ✅ Crea N usuarios virtuales
2. ✅ Cada usuario hace login con su cuenta
3. ✅ Cada usuario crea M pedidos de forma secuencial
4. ✅ Todos los usuarios operan en paralelo
5. ✅ Genera estadísticas detalladas de rendimiento

### Métricas reportadas

- ⏱️ Tiempo total de ejecución
- ⏱️ Tiempo promedio por usuario
- ✅ Tasa de éxito de logins
- 📦 Total de pedidos creados
- ❌ Pedidos fallidos
- 📈 Throughput (pedidos/segundo)
- ⚠️ Lista de errores encontrados

### Ejemplo de salida

```
============================================================
🚀 INICIANDO PRUEBA DE CARGA
============================================================
👥 Usuarios concurrentes: 50
📦 Pedidos por usuario: 3
⏱️  Delay entre pedidos: 500ms
⏱️  Delay inicio usuarios: 100ms
============================================================

✅ [Usuario 1] Login exitoso (245ms)
📦 [Usuario 1] Pedido creado (156ms) - Total items: 4
...

============================================================
📊 RESULTADOS DE LA PRUEBA DE CARGA
============================================================
⏱️  Tiempo total: 15.45s
⏱️  Tiempo promedio por usuario: 12.34s
✅ Logins exitosos: 50/50 (100.0%)
📦 Pedidos creados: 150
❌ Pedidos fallidos: 0
⚠️  Total errores: 0
📈 Throughput: 9.71 pedidos/segundo
============================================================
```

## 🎯 Escenarios de Prueba Recomendados

### 1. Prueba Ligera (Desarrollo)
```bash
CONCURRENT_USERS=10 ORDERS_PER_USER=2 node testing/load-test.js
```
- **Objetivo:** Verificar que todo funciona
- **Duración:** ~5 segundos
- **Pedidos:** ~20

### 2. Prueba Media (Pre-producción)
```bash
CONCURRENT_USERS=50 ORDERS_PER_USER=5 node testing/load-test.js
```
- **Objetivo:** Simular carga normal
- **Duración:** ~15-20 segundos
- **Pedidos:** ~250

### 3. Prueba Intensa (Stress Test)
```bash
CONCURRENT_USERS=200 ORDERS_PER_USER=10 DELAY_MS=200 node testing/load-test.js
```
- **Objetivo:** Probar límites del sistema
- **Duración:** ~30-45 segundos
- **Pedidos:** ~2000

### 4. Prueba Extrema (Peak Load)
```bash
CONCURRENT_USERS=500 ORDERS_PER_USER=5 DELAY_MS=100 USER_DELAY_MS=50 node testing/load-test.js
```
- **Objetivo:** Simular pico de demanda
- **Duración:** ~60 segundos
- **Pedidos:** ~2500

## 📊 Análisis de Resultados

### Verificar datos en Supabase

```sql
-- Ver total de usuarios de prueba
SELECT COUNT(*) FROM public.users WHERE email LIKE '%@servifood.test';

-- Ver pedidos por estado
SELECT status, COUNT(*) as total
FROM public.orders
GROUP BY status
ORDER BY total DESC;

-- Ver actividad reciente
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as pedidos
FROM public.orders
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY fecha
ORDER BY fecha DESC;

-- Top 10 usuarios más activos
SELECT 
  u.email,
  COUNT(o.id) as total_pedidos
FROM public.users u
JOIN public.orders o ON u.id = o.user_id
WHERE u.email LIKE '%@servifood.test'
GROUP BY u.email
ORDER BY total_pedidos DESC
LIMIT 10;
```

## 🧹 Limpieza de Datos de Prueba

### Eliminar todos los usuarios y pedidos de prueba

**⚠️ CUIDADO: Esto es irreversible**

```sql
-- En Supabase SQL Editor:

-- Eliminar pedidos de usuarios de prueba
DELETE FROM public.orders 
WHERE user_id IN (
  SELECT id FROM public.users WHERE email LIKE '%@servifood.test'
);

-- Eliminar usuarios de prueba
DELETE FROM auth.users WHERE email LIKE '%@servifood.test';
DELETE FROM public.users WHERE email LIKE '%@servifood.test';

-- Verificar limpieza
SELECT COUNT(*) FROM public.users WHERE email LIKE '%@servifood.test';
```

## 🐛 Troubleshooting

### Error: "Faltan variables de entorno"
- Verifica que tu `.env` tenga todas las variables
- Asegúrate de que el Service Role Key sea correcto

### Error: "No hay usuarios de prueba"
- Ejecuta primero `create-test-users.js`
- Verifica en Supabase que existen usuarios con `@servifood.test`

### Error: "Rate limit exceeded"
- Reduce `CONCURRENT_USERS`
- Aumenta `DELAY_MS` y `USER_DELAY_MS`
- Supabase tiene límites en el plan gratuito

### Error de autenticación en load-test
- Verifica que los usuarios existan en `auth.users`
- Confirma que el password sea `Test123!@#`
- Revisa las políticas RLS en Supabase

### Rendimiento bajo
- Verifica tu conexión a internet
- Revisa el plan de Supabase (tier gratuito tiene límites)
- Considera escalar la base de datos para pruebas intensas

## 💡 Tips y Mejores Prácticas

1. **Comienza pequeño:** Prueba con pocos usuarios primero
2. **Monitorea Supabase:** Revisa el Dashboard > Logs durante las pruebas
3. **Escala gradualmente:** Aumenta la carga progresivamente
4. **Limpia regularmente:** No acumules datos de prueba indefinidamente
5. **Usa datos realistas:** Los scripts ya generan datos variados y realistas
6. **Documenta hallazgos:** Anota los límites y cuellos de botella que encuentres

## 📈 Próximos Pasos

- Implementar métricas de rendimiento en la UI
- Agregar monitoreo de errores en tiempo real
- Crear dashboards de analytics
- Implementar rate limiting si es necesario
- Optimizar queries lentas identificadas

## 📞 Soporte

Si encuentras problemas o tienes sugerencias, revisa:
- La documentación de Supabase: https://supabase.com/docs
- Los logs en Supabase Dashboard
- Las políticas RLS configuradas

---

**Última actualización:** Noviembre 2025
