# 🧪 Pruebas de Carga - ServiFood

## 📋 Descripción

Script automatizado para realizar pruebas de carga en la aplicación ServiFood. Simula múltiples usuarios creando pedidos simultáneamente y **limpia automáticamente** todos los datos de prueba al finalizar.

## ✨ Características

- ✅ Crea usuarios de prueba automáticamente
- ✅ Simula login y pedidos simultáneos
- ✅ Genera datos realistas (nombres, ubicaciones, menús)
- ✅ **Limpieza automática** - No deja rastro en la base de datos
- ✅ Reportes detallados de rendimiento
- ✅ Configurable (número de usuarios y pedidos)

## 🚀 Uso Rápido

### Prueba Ligera (10 usuarios, 5 pedidos c/u)
```bash
npm run test:light
```

### Prueba Media (50 usuarios, 10 pedidos c/u)
```bash
npm run test:medium
```

### Prueba Pesada (100 usuarios, 20 pedidos c/u)
```bash
npm run test:heavy
```

### Personalizada
```bash
npm run test:load
# O con parámetros:
node testing/load/test-load.js <usuarios> <pedidos_por_usuario>

# Ejemplos:
node testing/load/test-load.js 25 8     # 25 usuarios, 8 pedidos cada uno = 200 pedidos totales
node testing/load/test-load.js 200 15   # 200 usuarios, 15 pedidos cada uno = 3000 pedidos totales
```

## 📊 Qué Hace el Script

### Fase 1: Creación de Usuarios
- Genera usuarios con emails únicos: `test_user_<timestamp>_<index>@servifood.test`
- Nombres aleatorios de una lista predefinida
- Registra en Supabase Auth y tabla `users`

### Fase 2: Simulación de Actividad
- Cada usuario crea múltiples pedidos simultáneamente
- Datos aleatorios pero realistas:
  - Ubicaciones: Los Berros, La Laja, Padre Bueno
  - Platos: Milanesa, Pollo, Carne + Ensaladas
  - Estados: 75% pendientes, 25% completados
  - Teléfonos y comentarios generados

### Fase 3: Limpieza Automática
- Elimina todos los pedidos de prueba
- Elimina todos los usuarios de prueba
- La base de datos queda en su estado original

## 📈 Reporte de Ejemplo

```
============================================================
📊 REPORTE DE PRUEBA DE CARGA
============================================================

⏱️  Duración: 45.32 segundos

👥 Usuarios:
   - Total creados: 50
   - Exitosos: 50

📦 Pedidos:
   - Total creados: 500
   - Promedio por usuario: 10.00
   - Pedidos por segundo: 11.03

🎯 Rendimiento:
   - Tiempo promedio por pedido: 0.091s
   - Throughput: 11.03 pedidos/seg

============================================================
```

## ⚙️ Configuración

### Variables de Entorno Requeridas

**IMPORTANTE:** Antes de ejecutar las pruebas, debes crear un archivo `.env` con tus credenciales de Supabase.

#### Paso 1: Crear archivo .env

```bash
# En la raíz del proyecto
touch .env
```

#### Paso 2: Agregar credenciales

Abre `.env` y agrega (reemplaza con tus valores reales):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Paso 3: Encontrar tus credenciales

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Click en "Settings" (⚙️) en el menú lateral
4. Click en "API"
5. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

#### Alternativa: Copiar desde .env.example

```bash
cp .env.example .env
# Luego edita .env con tus credenciales reales
```

### Verificar Configuración

Para verificar que las variables están cargadas correctamente:

```bash
node -e "import('dotenv').then(d => { d.default.config(); console.log('URL:', process.env.VITE_SUPABASE_URL ? '✓ OK' : '✗ Falta'); console.log('KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✓ OK' : '✗ Falta'); })"
```

El script usa las variables de entorno del archivo `.env`:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

**Importante**: Estas variables ya deberían estar configuradas si la app funciona.

## 🔒 Seguridad

- ✅ Usa credenciales de prueba únicas
- ✅ Los emails de prueba son claramente identificables (`@servifood.test`)
- ✅ Limpieza automática garantizada
- ✅ No afecta datos reales de usuarios

## 📝 Notas Importantes

### ⚠️ Antes de Ejecutar

1. **Asegúrate de tener conexión a internet** - El script se conecta a Supabase
2. **Verifica que las variables de entorno estén configuradas**
3. **Ejecuta primero una prueba ligera** para verificar que todo funciona

### 🎯 Casos de Uso

**Prueba de Rendimiento**:
```bash
npm run test:heavy
```
Útil para ver cómo se comporta la app con muchos usuarios.

**Desarrollo Local**:
```bash
npm run test:light
```
Crea datos rápidamente para probar la UI.

**Testing de Base de Datos**:
```bash
node testing/load/test-load.js 500 50
```
Prueba extrema: 25,000 pedidos para verificar límites.

### 🛠️ Troubleshooting

**Error: "Faltan variables de entorno"**
- Solución: Verifica que el archivo `.env` exista y tenga las claves de Supabase

**Error: "Cannot find module dotenv"**
- Solución: `npm install`

**Limpieza parcial**
- El script intenta limpiar todo automáticamente
- Si falla, los registros tienen `@servifood.test` en el email para identificarlos manualmente

## 🔄 Flujo del Script

```
1. Crear usuarios de prueba
   ↓
2. Simular pedidos simultáneos (paralelo)
   ↓
3. Generar reporte de rendimiento
   ↓
4. Limpiar TODOS los datos de prueba
   ↓
5. Confirmar base de datos limpia
```

## 📊 Métricas que Puedes Analizar

Con los reportes generados puedes evaluar:

- **Throughput**: ¿Cuántos pedidos por segundo soporta el sistema?
- **Latencia**: ¿Cuánto tarda en crear un pedido?
- **Escalabilidad**: ¿Cómo afecta el aumento de usuarios?
- **Concurrencia**: ¿El sistema maneja bien múltiples requests simultáneos?

## 🎓 Ejemplo de Sesión Completa

```bash
$ npm run test:medium

🚀 INICIANDO PRUEBA DE CARGA - SERVIFOOD
============================================================

📋 Configuración:
   - Usuarios a simular: 50
   - Pedidos por usuario: 10
   - Total de pedidos esperados: 500

⚠️  NOTA: Todos los datos se eliminarán al finalizar

📝 FASE 1: Creando usuarios de prueba...
   Creando usuario 1/50: test_user_1699999999_0@servifood.test
   Creando usuario 2/50: test_user_1699999999_1@servifood.test
   ...
   ✅ 50 usuarios creados exitosamente

🔄 FASE 2: Simulando actividad de usuarios...
   👤 Usuario 1 (test_user_1699999999_0@servifood.test):
      ✅ Pedido 1/10 creado - Los Berros
      ✅ Pedido 2/10 creado - La Laja
      ...

[REPORTE GENERADO]

🧹 Limpiando datos de prueba...
   Eliminando 500 pedidos de prueba...
   ✅ 500 pedidos eliminados
   Eliminando 50 usuarios de prueba...
   ✅ 50 usuarios eliminados

✅ PRUEBA COMPLETADA EXITOSAMENTE
💾 La base de datos volvió a su estado original
```

## 🚨 Importante

**ESTE SCRIPT ES PARA TESTING ÚNICAMENTE**

- ❌ NO ejecutar en producción con usuarios reales activos
- ✅ Ideal para desarrollo y staging
- ✅ Seguro para testing local

---

¿Dudas? Revisa el código del script: `testing/load/test-load.js`
