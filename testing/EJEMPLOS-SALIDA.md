# 📸 Ejemplos de Salida de los Scripts

Este archivo muestra ejemplos de lo que verás al ejecutar cada script.

## Estado del documento

- Ejemplo: la salida puede cambiar según versión del repo y datos reales en Supabase.
- Nota: el runner principal actual está en `testing/load/test-load.js` (y scripts `npm run test:*` en la raíz). Este archivo todavía incluye ejemplos antiguos de `load-test.js`.
- Nota: la distribución por `status` en ejemplos puede no coincidir con los estados reales que usa tu instancia.

---

## 1. create-test-users.js

```
🚀 Iniciando creación de usuarios de prueba...

📊 Total a crear: 100 usuarios
🔑 Password para todos: Test123!@#

📦 Procesando lote 1/10...
✅ [1/100] Usuario creado: test.user1@servifood.test (user)
✅ [2/100] Usuario creado: test.user2@servifood.test (user)
✅ [3/100] Usuario creado: test.user3@servifood.test (admin)
✅ [4/100] Usuario creado: test.user4@servifood.test (user)
...

==================================================
✨ RESUMEN DE CREACIÓN DE USUARIOS
==================================================
✅ Exitosos: 100
❌ Fallidos: 0
📧 Email pattern: test.user[1-100]@servifood.test
🔑 Password: Test123!@#
==================================================

📊 Total de usuarios de prueba en la BD: 100
```

---

## 2. load-test.js (Prueba Media)

```
============================================================
🚀 INICIANDO PRUEBA DE CARGA
============================================================
👥 Usuarios concurrentes: 50
📦 Pedidos por usuario: 5
⏱️  Delay entre pedidos: 500ms
⏱️  Delay inicio usuarios: 100ms
============================================================

✅ [Usuario 1] Login exitoso (245ms)
📦 [Usuario 1] Pedido creado (156ms) - Total items: 4
✅ [Usuario 2] Login exitoso (198ms)
📦 [Usuario 1] Pedido creado (143ms) - Total items: 2
📦 [Usuario 2] Pedido creado (167ms) - Total items: 5
✅ [Usuario 3] Login exitoso (212ms)
...

⏳ Todos los usuarios lanzados. Esperando finalizacion...

============================================================
📊 RESULTADOS DE LA PRUEBA DE CARGA
============================================================
⏱️  Tiempo total: 15.45s
⏱️  Tiempo promedio por usuario: 12.34s
✅ Logins exitosos: 50/50 (100.0%)
📦 Pedidos creados: 250
❌ Pedidos fallidos: 0
⚠️  Total errores: 0
📈 Throughput: 16.18 pedidos/segundo
============================================================

✨ Prueba completada!
```

---

## 3. monitor.js

```
══════════════════════════════════════════════════════════════════
📊 MONITOR EN TIEMPO REAL - ServiFood 18:45:32
══════════════════════════════════════════════════════════════════

👥 USUARIOS
──────────────────────────────────────────────────────────────────
   Total: 150
   De prueba: 100 (66.7%)

📦 PEDIDOS
──────────────────────────────────────────────────────────────────
   Total: 1250
   Hoy: 450
   Último minuto: 15 🔥

   ⚡ Cambios recientes:
      +15 pedido(s)

📊 DISTRIBUCIÓN POR ESTADO
──────────────────────────────────────────────────────────────────
   ⏳ Pendiente            625 (50.0%) █████████████████████████
   🔄 En Proceso           375 (30.0%) ███████████████
   ✅ Completado           188 (15.0%) ███████
   🚚 Entregado             50 (4.0%)  ██
   ❌ Cancelado             12 (1.0%)  

══════════════════════════════════════════════════════════════════
⏱️  Actualización cada 2s | Presiona Ctrl+C para salir
══════════════════════════════════════════════════════════════════
```

---

## 4. start-test.sh (Asistente Interactivo)

```
════════════════════════════════════════════════════════════════
🧪 ASISTENTE DE PRUEBAS DE CARGA - ServiFood
════════════════════════════════════════════════════════════════

📦 Verificando dependencias...

════════════════════════════════════════════════════════════════
🎯 OPCIONES DE PRUEBA
════════════════════════════════════════════════════════════════

1) Crear usuarios de prueba (necesario primero)
2) Prueba ligera (10 usuarios, 2 pedidos cada uno)
3) Prueba media (50 usuarios, 5 pedidos cada uno)
4) Prueba intensa (200 usuarios, 10 pedidos cada uno)
5) Prueba extrema (500 usuarios, 5 pedidos cada uno)
6) Monitor en tiempo real
7) Personalizada
0) Salir

Selecciona una opción: 2

🚀 Ejecutando prueba ligera...

[... output del load-test.js ...]

════════════════════════════════════════════════════════════════
✅ Proceso completado
════════════════════════════════════════════════════════════════

💡 Tips:
   - Usa el monitor para ver actividad en tiempo real
   - Revisa testing/README.md para más información
   - Verifica los resultados en Supabase Dashboard
```

---

## 5. SQL Scripts (Ejemplo)

Estado: **No implementado (repo)**. Este repo no incluye `generate-test-users.sql` ni `generate-test-orders.sql`. Se deja el ejemplo para referencia si querés crear tus propios scripts en Supabase.

### generate-test-users.sql

```sql
SELECT * FROM generate_test_users(50);
```

**Resultado:**
```
                  email                  |   full_name    | role  | temp_password
─────────────────────────────────────────┼────────────────┼───────┼──────────────
 test.user1@servifood.test               | Juan García    | user  | Test123!@#
 test.user2@servifood.test               | María López    | admin | Test123!@#
 test.user3@servifood.test               | Carlos Pérez   | user  | Test123!@#
 ...
(50 rows)
```

### generate-test-orders.sql

```sql
SELECT generate_test_orders(500) as pedidos_creados;
```

**Resultado:**
```
 pedidos_creados
─────────────────
             500
(1 row)
```

**Verificación:**
```sql
SELECT status, COUNT(*) as cantidad
FROM public.orders
GROUP BY status;
```

```
  status    | cantidad
────────────┼──────────
 pending    |      250
 processing |      150
 completed  |       75
 delivered  |       20
 cancelled  |        5
(5 rows)
```

---

## 📊 Interpretación de Resultados

### ✅ Prueba Exitosa
- **Logins exitosos:** 100%
- **Pedidos fallidos:** 0
- **Errores:** 0
- **Throughput:** > 10 pedidos/segundo

### ⚠️ Prueba con Problemas
- **Logins exitosos:** < 90%
- **Pedidos fallidos:** > 5%
- **Errores:** Presentes en el resumen
- **Throughput:** < 5 pedidos/segundo

### 🔥 Indicadores de Sobrecarga
- Timeouts en las peticiones
- Errores de rate limiting
- Throughput en caída progresiva
- Tiempos de respuesta > 1000ms

---

## 🎯 Benchmarks Esperados

| Escenario | Usuarios | Pedidos | Tiempo esperado | Throughput |
|-----------|----------|---------|-----------------|------------|
| Ligera    | 10       | 20      | 3-5s           | 4-7 p/s    |
| Media     | 50       | 250     | 15-20s         | 12-17 p/s  |
| Intensa   | 200      | 2000    | 45-60s         | 30-45 p/s  |
| Extrema   | 500      | 2500    | 60-90s         | 25-40 p/s  |

*Estos valores pueden variar según tu plan de Supabase y conexión a internet*

---

**Nota:** Estos son ejemplos representativos. Los valores exactos variarán según:
- Plan de Supabase (Free/Pro)
- Velocidad de conexión a internet
- Carga actual del servidor
- Configuración de delays
