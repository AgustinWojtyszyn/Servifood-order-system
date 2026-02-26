-- ============================================
-- EXPORTAR PEDIDOS A CSV LEGIBLE (VERSIÓN PUNTO Y COMA)
-- ============================================

-- Esta consulta genera datos separados por PUNTO Y COMA
-- Excel en español reconoce mejor este formato

SELECT 
    ROW_NUMBER() OVER (ORDER BY o.created_at DESC) || ';' ||
    TO_CHAR(o.created_at, 'DD-MM-YYYY HH24:MI') || ';' ||
    COALESCE(REPLACE(u.full_name, ';', ' '), '') || ';' ||
    REPLACE(o.customer_name, ';', ' ') || ';' ||
    REPLACE(o.customer_email, ';', ' ') || ';' ||
    COALESCE(REPLACE(o.customer_phone, ';', ' '), '') || ';' ||
    REPLACE(o.location, ';', ' ') || ';' ||
    COALESCE(
        (
            SELECT STRING_AGG(
                (item->>'quantity')::text || 'x ' || REPLACE(REPLACE(item->>'name', ';', ' '), ',', ' ') || ' ($' || (item->>'price')::text || ')',
                ' | '
            )
            FROM jsonb_array_elements(o.items) as item
        ),
        ''
    ) || ';' ||
    o.total_items::text || ';' ||
    ROUND((
        SELECT SUM((item->>'quantity')::numeric * (item->>'price')::numeric)
        FROM jsonb_array_elements(o.items) as item
    ), 2)::text || ';' ||
    CASE o.status
        WHEN 'pending' THEN 'Pendiente'
        WHEN 'archived' THEN 'Archivado'
        WHEN 'cancelled' THEN 'Cancelado'
        ELSE o.status
    END || ';' ||
    TO_CHAR(o.delivery_date, 'DD-MM-YYYY') || ';' ||
    COALESCE(REPLACE(o.comments, ';', ' '), '') as "Datos"
FROM 
    public.orders o
LEFT JOIN 
    public.users u ON o.user_id = u.id
ORDER BY 
    o.created_at DESC;

-- ============================================
-- INSTRUCCIONES ACTUALIZADAS:
-- ============================================
-- 1. Ejecuta esta consulta en Supabase
-- 2. Copia el resultado de la columna "Datos"
-- 3. Pega en un archivo de texto (Notepad/VS Code)
-- 4. En la primera línea agrega los encabezados:
--    Numero;Fecha_Hora;Cliente_Registrado;Nombre_Cliente;Email;Telefono;Ubicacion;Items_Pedidos;Cantidad_Total;Monto_Total;Estado;Fecha_Entrega;Comentarios
-- 5. Guarda como "pedidos.csv"
-- 6. Abre Excel → Datos → Desde texto/CSV
-- 7. En el asistente, selecciona:
--    - Delimitador: PUNTO Y COMA (;)
--    - Codificación: UTF-8
