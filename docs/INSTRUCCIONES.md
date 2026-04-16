# 📋 Instrucciones de Configuración

## Estado del documento

- No implementado (repo): `fix-admin-permissions-FINAL.sql` no existe en este repo.
- Implementado: exportación a Excel + compartir WhatsApp en `DailyOrders`.
- Implementado: exportación usa `exceljs` (no `xlsx`).

## 🔐 Paso 1: Arreglar Permisos de Administradores

Para que **TODOS los administradores** tengan los mismos permisos completos (sin distinción de superadmin):

Estado: **Ejemplo / configuración externa**.

Este repo no trae un script único para policies de admin. Para alinear permisos:

1. Ve a **Supabase Dashboard** → revisa RLS/policies de las tablas relevantes.
2. Asegurate de que los usuarios admin tengan `role = 'admin'` en `public.users`.
3. Proba el flujo en la app (menú, opciones, cleanup, exportaciones).

### ¿Qué hace este script?

Estado: **No implementado en el repo** (se eliminó del doc porque el script no existe).

### ⚠️ Importante:
- La UI habilita acciones de admin, pero el enforcement real depende de Supabase (RLS/policies).
- Ver doc: `docs/ADMIN-PERMISSIONS-FIX.md`

---

## 📊 Paso 2: Exportar Pedidos Diarios

### ✨ Nuevas Funcionalidades

#### 1. **Exportar a Excel (.xlsx)**

- Formato **XLSX** compatible con Excel 2016 y versiones anteriores
- Incluye **2 hojas**:
  - **Pedidos Detallados**: Todos los datos de cada pedido
  - **Estadísticas**: Resumen por ubicación, platillos, estados, etc.
- Columnas ajustadas automáticamente para fácil lectura
- Información completa:
  - Fecha y hora del pedido
  - Datos del cliente (nombre, email, teléfono)
  - Ubicación de entrega
  - Platillos ordenados
  - Estado del pedido
  - Comentarios y opciones adicionales

**Cómo usar:**
1. Ve a **Pedidos Diarios** en el menú
2. Aplica filtros si deseas (ubicación, estado, platillo)
3. Haz clic en **Exportar a Excel**
4. El archivo se descarga automáticamente

**Compartir el archivo:**
- **Por email**: Adjunta el archivo `.xlsx` descargado
- **Por WhatsApp Web**: Adjunta el archivo como documento
- **Por WhatsApp móvil**: Usa "Compartir archivo" y selecciona WhatsApp

#### 2. **Compartir Resumen por WhatsApp**

- Genera un resumen de texto optimizado para WhatsApp
- Incluye:
  - Total de pedidos
  - Pedidos completados/pendientes
  - Pedidos por ubicación
  - Top 5 platillos más pedidos
- Perfecto para enviar actualizaciones rápidas al equipo

**Cómo usar:**
1. Haz clic en **Compartir Resumen**
2. Se abre WhatsApp Web con el mensaje pre-formateado
3. Selecciona el contacto o grupo y envía

---

## 📦 Dependencias Instaladas

- `exceljs`: Librería para generar archivos Excel (XLSX)

---

## 🎯 Resumen de Cambios

### Archivos Modificados:
- `src/components/DailyOrders.jsx`: Exportación XLSX + compartir WhatsApp
- `package.json`: Dependencia `exceljs` agregada

### Archivos Nuevos:
- `INSTRUCCIONES.md`: Este archivo

---

## 🐛 Solución de Problemas

### "Los administradores no pueden editar el menú"
→ Revisa RLS/policies en Supabase (no hay script versionado en este repo).

### "El archivo Excel no se abre correctamente"
→ El formato XLSX es compatible con Excel 2016+. Si usas una versión más antigua, actualiza Excel o usa LibreOffice/Google Sheets

### "No aparece el botón de exportar"
→ Asegúrate de tener rol de administrador en la aplicación

---

## ✅ Verificación

Para verificar que todo funciona:

1. **Permisos de Admin:**
   - Entra con una cuenta admin (que no sea la primera)
   - Ve a Panel Admin → Gestionar Menú
   - Intenta agregar/editar un platillo
   - Debería funcionar sin errores

2. **Exportación Excel:**
   - Ve a Pedidos Diarios
   - Haz clic en "Exportar a Excel"
   - Abre el archivo descargado en Excel
   - Verifica que tiene 2 hojas y los datos son legibles

3. **Compartir WhatsApp:**
   - Haz clic en "Compartir Resumen"
   - Verifica que se abre WhatsApp Web
   - El mensaje debe tener formato con emojis y estadísticas

---

## 🚀 ¡Listo!

Todos los administradores ahora tienen permisos completos y pueden exportar pedidos en formato Excel profesional.
