# 📊 Guía para Ver Respuestas Personalizadas en Supabase

## Estado del documento

- No implementado (repo): este repo no incluye `create-readable-responses-views.sql` ni `export-responses-readable.sql`.
- Ejemplo: las vistas/consultas de este documento sirven si **vos** las creás en Supabase (SQL Editor) con tu propio script.
- Implementado (app): los pedidos guardan `custom_responses` en formato JSON, pero la capa de “vistas legibles” es externa (DB).

## 🎯 Objetivo
Esta guía te explica cómo ver de forma **legible y organizada** todas las respuestas a las opciones personalizadas (encuestas, preferencias, alergias, etc.) que los usuarios completan en sus pedidos.

---

## 📋 Paso 1: Crear las Vistas en Supabase

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto ServiFood
   - Haz clic en **SQL Editor** en el menú lateral

2. **Crear las vistas (Ejemplo)**
   - Este repo no trae el archivo `create-readable-responses-views.sql`.
   - Si querés estas vistas, tenés que escribir/pegar el SQL en el **SQL Editor** de Supabase y ejecutarlo.

3. **Verifica que se crearon**
   - Deberías ver un mensaje de éxito
   - Se crearán 5 vistas nuevas

---

## 🔍 Vistas Disponibles

### 1️⃣ `orders_with_responses` - Vista Completa de Pedidos
**¿Para qué sirve?** Ver todos los pedidos con sus respuestas personalizadas en una sola línea.

**Cómo usar:**
```sql
SELECT * FROM orders_with_responses;
```

**Columnas principales:**
- `nombre_usuario`: Nombre del usuario que hizo el pedido
- `ubicacion`: Dónde trabaja (Los Berros, La Laja, etc.)
- `platillos`: Qué pidió
- `respuestas_personalizadas_texto`: **TODAS las respuestas en texto legible**
- `comentarios`: Comentarios adicionales

**Ejemplo de respuesta legible:**
```
¿Prefieres alguna bebida?: Agua | ¿Tienes alguna alergia?: Maní | Preferencias adicionales: Sin cebolla, Extra picante
```

---

### 2️⃣ `custom_responses_detail` - Detalle de Cada Respuesta
**¿Para qué sirve?** Ver cada respuesta en una fila separada para análisis detallado.

**Cómo usar:**
```sql
SELECT * FROM custom_responses_detail;
```

**Columnas principales:**
- `pregunta`: La pregunta de la opción personalizada
- `respuesta`: La respuesta del usuario
- `tipo_respuesta`: 'array' (múltiple) o 'string' (texto simple)

**Útil para:**
- Filtrar por pregunta específica
- Contar cuántas personas eligieron cada opción
- Exportar respuestas individuales

---

### 3️⃣ `orders_summary` - Resumen Ejecutivo
**¿Para qué sirve?** Vista simplificada con la información más importante.

**Cómo usar:**
```sql
SELECT * FROM orders_summary;
```

**Muestra:**
- Usuario y contacto
- Platillos pedidos con cantidades
- Opciones adicionales resumidas
- Estado del pedido

---

### 4️⃣ `orders_today` - Pedidos de Hoy
**¿Para qué sirve?** Ver solo los pedidos del día actual.

**Cómo usar:**
```sql
SELECT * FROM orders_today;
```

**Ideal para:**
- Preparar los pedidos del día
- Ver las preferencias de hoy
- Imprimir lista de preparación

---

### 5️⃣ `responses_by_question` - Estadísticas por Pregunta
**¿Para qué sirve?** Ver cuántas veces se seleccionó cada opción.

**Cómo usar:**
```sql
SELECT * FROM responses_by_question;
```

**Muestra:**
- Cuántas personas respondieron cada pregunta
- Qué opciones son las más populares
- Análisis de preferencias

---

## 💡 Consultas Útiles

### Ver pedidos con una respuesta específica
```sql
SELECT * FROM custom_responses_detail
WHERE pregunta LIKE '%bebida%';
```

### Ver pedidos de hoy con alergias
```sql
SELECT 
    nombre_usuario,
    ubicacion,
    respuesta as alergia
FROM custom_responses_detail
WHERE pregunta LIKE '%alergia%'
AND DATE(fecha_pedido) = CURRENT_DATE;
```

### Contar respuestas por ubicación
```sql
SELECT 
    ubicacion,
    pregunta,
    respuesta,
    COUNT(*) as cantidad
FROM custom_responses_detail
GROUP BY ubicacion, pregunta, respuesta
ORDER BY ubicacion, cantidad DESC;
```

### Ver solo pedidos con comentarios especiales
```sql
SELECT * FROM orders_summary
WHERE comentarios IS NOT NULL 
AND comentarios != '';
```

---

## 📤 Exportar a CSV

### Opción 1: Desde Supabase Dashboard
1. Ejecuta cualquier consulta en SQL Editor
2. Haz clic en **"Download as CSV"**
3. Abre en Excel o Google Sheets

### Opción 2: Usar el script de exportación
Estado: **Ejemplo**. Este repo no incluye `export-responses-readable.sql`. Podés copiar las consultas de este documento (o las tuyas) en el SQL Editor y descargar CSV desde Supabase.

---

## 📊 Ejemplos Prácticos

### Preparar pedidos del día
```sql
-- Lista para la cocina
SELECT 
    usuario,
    ubicacion,
    platillos,
    opciones_adicionales,
    comentarios
FROM orders_today
WHERE estado = 'pending'
ORDER BY ubicacion;
```

### Reporte semanal de preferencias
```sql
-- Ver tendencias de la semana
SELECT 
    pregunta,
    respuesta,
    COUNT(*) as veces_elegida
FROM custom_responses_detail
WHERE fecha_pedido >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY pregunta, respuesta
ORDER BY pregunta, veces_elegida DESC;
```

### Análisis de alergias
```sql
-- Identificar usuarios con alergias
SELECT DISTINCT
    nombre_usuario,
    email_usuario,
    respuesta as alergia
FROM custom_responses_detail
WHERE pregunta LIKE '%alergia%'
AND respuesta IS NOT NULL
AND respuesta != ''
ORDER BY nombre_usuario;
```

---

## 🎨 En Supabase Table Editor

Después de crear las vistas, también puedes verlas visualmente:

1. Ve a **Table Editor** en Supabase
2. En el selector de tablas, busca las vistas (aparecen con icono diferente)
3. Haz clic en cualquier vista
4. Verás los datos en formato tabla
5. Puedes filtrar, ordenar y buscar

---

## 🔄 Actualización de Datos

Las vistas se actualizan **automáticamente** cuando:
- Se crea un nuevo pedido
- Se modifica un pedido existente
- Se agregan nuevas respuestas

**No necesitas volver a ejecutar el script**, las vistas siempre muestran los datos más recientes.

---

## 🆘 Solución de Problemas

### "La vista no existe"
- Re-ejecuta `create-readable-responses-views.sql`

### "No veo datos"
- Verifica que tengas pedidos con `custom_responses`
- Ejecuta: `SELECT COUNT(*) FROM orders WHERE custom_responses IS NOT NULL;`

### "Aparecen caracteres raros"
- Usa la vista `orders_summary` que tiene mejor formato
- O descarga como CSV con codificación UTF-8

---

## 📞 Soporte

Si tienes dudas sobre cómo usar las vistas o necesitas una consulta específica:
- WhatsApp: +54 264 440 5294
- Incluye un pantallazo de lo que necesitas ver

---

**¡Listo!** Ahora puedes ver todas las respuestas personalizadas de forma clara y organizada. 🎉
