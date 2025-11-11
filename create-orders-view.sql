-- ============================================
-- VISTA PARA MOSTRAR PEDIDOS MÁS CLAROS
-- ============================================

-- Eliminar vistas existentes primero
DROP VIEW IF EXISTS orders_detailed CASCADE;
DROP VIEW IF EXISTS orders_excel_export CASCADE;
DROP VIEW IF EXISTS orders_items_expanded CASCADE;
DROP VIEW IF EXISTS orders_count_by_user CASCADE;
DROP VIEW IF EXISTS orders_count_by_status CASCADE;
DROP VIEW IF EXISTS orders_count_by_location CASCADE;
DROP VIEW IF EXISTS most_ordered_items CASCADE;
DROP VIEW IF EXISTS orders_count_by_date CASCADE;
DROP VIEW IF EXISTS orders_summary CASCADE;

-- Crear vista que combina datos de orders con users
CREATE OR REPLACE VIEW orders_detailed AS
SELECT 
    o.id,
    o.created_at as "Fecha Pedido",
    u.full_name as "Nombre Cliente",
    u.email as "Email Cliente",
    o.customer_name as "Nombre en Pedido",
    o.customer_email as "Email en Pedido",
    o.customer_phone as "Teléfono",
    o.location as "Ubicación",
    o.items as "Items (JSON)",
    o.total_items as "Total Items",
    o.status as "Estado",
    o.delivery_date as "Fecha Entrega",
    o.comments as "Comentarios",
    -- Calcular total sumando precios de items
    (
        SELECT SUM((item->>'quantity')::numeric * (item->>'price')::numeric)
        FROM jsonb_array_elements(o.items) as item
    ) as "Total $"
FROM 
    public.orders o
LEFT JOIN 
    public.users u ON o.user_id = u.id
ORDER BY 
    o.created_at DESC;

-- Dar permisos de lectura a usuarios autenticados
GRANT SELECT ON orders_detailed TO authenticated;

-- ============================================
-- VISTA OPTIMIZADA PARA EXPORTAR A EXCEL
-- ============================================

-- Vista con items como texto legible en lugar de JSON
CREATE OR REPLACE VIEW orders_excel_export AS
SELECT 
    o.id as "ID Pedido",
    TO_CHAR(o.created_at, 'DD/MM/YYYY HH24:MI') as "Fecha y Hora",
    u.full_name as "Cliente Registrado",
    o.customer_name as "Nombre del Cliente",
    o.customer_email as "Email",
    o.customer_phone as "Teléfono",
    o.location as "Ubicación",
    -- Convertir items JSON a texto legible
    (
        SELECT STRING_AGG(
            (item->>'quantity')::text || 'x ' || (item->>'name')::text || ' ($' || (item->>'price')::text || ')',
            ', '
        )
        FROM jsonb_array_elements(o.items) as item
    ) as "Items Pedidos",
    o.total_items as "Cantidad Total",
    -- Calcular total
    (
        SELECT SUM((item->>'quantity')::numeric * (item->>'price')::numeric)
        FROM jsonb_array_elements(o.items) as item
    ) as "Monto Total",
    CASE o.status
        WHEN 'pending' THEN 'Pendiente'
        WHEN 'processing' THEN 'En Proceso'
        WHEN 'completed' THEN 'Completado'
        WHEN 'delivered' THEN 'Entregado'
        WHEN 'cancelled' THEN 'Cancelado'
        ELSE o.status
    END as "Estado",
    TO_CHAR(o.delivery_date, 'DD/MM/YYYY') as "Fecha de Entrega",
    COALESCE(o.comments, '') as "Comentarios"
FROM 
    public.orders o
LEFT JOIN 
    public.users u ON o.user_id = u.id
ORDER BY 
    o.created_at DESC;

GRANT SELECT ON orders_excel_export TO authenticated;

-- ============================================
-- VISTA ALTERNATIVA: ITEMS EXPANDIDOS
-- ============================================

-- Esta vista expande cada item del pedido en una fila separada
CREATE OR REPLACE VIEW orders_items_expanded AS
SELECT 
    o.id as "ID Pedido",
    TO_CHAR(o.created_at, 'DD/MM/YYYY HH24:MI') as "Fecha",
    u.full_name as "Cliente Registrado",
    o.customer_name as "Nombre del Cliente",
    o.customer_email as "Email",
    o.location as "Ubicación",
    item->>'name' as "Producto",
    (item->>'quantity')::integer as "Cantidad",
    (item->>'price')::numeric as "Precio Unitario",
    (item->>'quantity')::integer * (item->>'price')::numeric as "Subtotal",
    CASE o.status
        WHEN 'pending' THEN 'Pendiente'
        WHEN 'processing' THEN 'En Proceso'
        WHEN 'completed' THEN 'Completado'
        WHEN 'delivered' THEN 'Entregado'
        WHEN 'cancelled' THEN 'Cancelado'
        ELSE o.status
    END as "Estado",
    TO_CHAR(o.delivery_date, 'DD/MM/YYYY') as "Fecha Entrega"
FROM 
    public.orders o
LEFT JOIN 
    public.users u ON o.user_id = u.id,
    jsonb_array_elements(o.items) as item
ORDER BY 
    o.created_at DESC;

-- Dar permisos
GRANT SELECT ON orders_items_expanded TO authenticated;

-- ============================================
-- VISTAS DE CONTABILIZACIÓN
-- ============================================

-- Contabilizar pedidos por usuario
CREATE OR REPLACE VIEW orders_count_by_user AS
SELECT 
    u.full_name as "Cliente",
    u.email as "Email",
    COUNT(o.id) as "Total Pedidos",
    COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as "Pendientes",
    COUNT(CASE WHEN o.status = 'processing' THEN 1 END) as "En Proceso",
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as "Completados",
    COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as "Cancelados",
    SUM(
        (SELECT SUM((item->>'quantity')::numeric * (item->>'price')::numeric)
         FROM jsonb_array_elements(o.items) as item)
    ) as "Total Gastado $"
FROM 
    public.users u
LEFT JOIN 
    public.orders o ON u.id = o.user_id
GROUP BY 
    u.id, u.full_name, u.email
ORDER BY 
    "Total Pedidos" DESC;

GRANT SELECT ON orders_count_by_user TO authenticated;

-- Contabilizar pedidos por estado
CREATE OR REPLACE VIEW orders_count_by_status AS
SELECT 
    CASE status
        WHEN 'pending' THEN 'Pendiente'
        WHEN 'processing' THEN 'En Proceso'
        WHEN 'completed' THEN 'Completado'
        WHEN 'delivered' THEN 'Entregado'
        WHEN 'cancelled' THEN 'Cancelado'
        ELSE status
    END as "Estado",
    COUNT(*) as "Cantidad de Pedidos",
    SUM(total_items) as "Total de Items",
    ROUND(SUM(
        (SELECT SUM((item->>'quantity')::numeric * (item->>'price')::numeric)
         FROM jsonb_array_elements(items) as item)
    ), 2) as "Monto Total $"
FROM 
    public.orders
GROUP BY 
    status
ORDER BY 
    "Cantidad de Pedidos" DESC;

GRANT SELECT ON orders_count_by_status TO authenticated;

-- Contabilizar pedidos por ubicación
CREATE OR REPLACE VIEW orders_count_by_location AS
SELECT 
    location as "Ubicación",
    COUNT(*) as "Total de Pedidos",
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as "Pendientes",
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as "Completados",
    SUM(total_items) as "Total de Items",
    ROUND(SUM(
        (SELECT SUM((item->>'quantity')::numeric * (item->>'price')::numeric)
         FROM jsonb_array_elements(items) as item)
    ), 2) as "Monto Total $"
FROM 
    public.orders
GROUP BY 
    location
ORDER BY 
    "Total de Pedidos" DESC;

GRANT SELECT ON orders_count_by_location TO authenticated;

-- Contabilizar items más pedidos
CREATE OR REPLACE VIEW most_ordered_items AS
SELECT 
    item->>'name' as "Producto",
    SUM((item->>'quantity')::integer) as "Cantidad Total Pedida",
    COUNT(DISTINCT o.id) as "Aparece en N° Pedidos",
    (item->>'price')::numeric as "Precio Unitario",
    ROUND(SUM((item->>'quantity')::integer * (item->>'price')::numeric), 2) as "Ingresos Generados $"
FROM 
    public.orders o,
    jsonb_array_elements(o.items) as item
GROUP BY 
    item->>'name', item->>'price'
ORDER BY 
    "Cantidad Total Pedida" DESC;

GRANT SELECT ON most_ordered_items TO authenticated;

-- Contabilizar pedidos por fecha
CREATE OR REPLACE VIEW orders_count_by_date AS
SELECT 
    TO_CHAR(created_at, 'DD/MM/YYYY') as "Fecha",
    COUNT(*) as "Total de Pedidos",
    SUM(total_items) as "Total de Items",
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as "Pendientes",
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as "Completados",
    ROUND(SUM(
        (SELECT SUM((item->>'quantity')::numeric * (item->>'price')::numeric)
         FROM jsonb_array_elements(items) as item)
    ), 2) as "Monto Total $"
FROM 
    public.orders
GROUP BY 
    DATE(created_at), TO_CHAR(created_at, 'DD/MM/YYYY')
ORDER BY 
    DATE(created_at) DESC;

GRANT SELECT ON orders_count_by_date TO authenticated;

-- ============================================
-- RESUMEN GENERAL
-- ============================================

CREATE OR REPLACE VIEW orders_summary AS
SELECT 
    (SELECT COUNT(*) FROM public.orders) as "Total de Pedidos",
    (SELECT COUNT(*) FROM public.orders WHERE status = 'pending') as "Pendientes",
    (SELECT COUNT(*) FROM public.orders WHERE status = 'processing') as "En Proceso",
    (SELECT COUNT(*) FROM public.orders WHERE status = 'completed') as "Completados",
    (SELECT COUNT(*) FROM public.orders WHERE status = 'cancelled') as "Cancelados",
    (SELECT SUM(total_items) FROM public.orders) as "Total de Items Pedidos",
    (SELECT COUNT(DISTINCT user_id) FROM public.orders) as "Clientes Únicos",
    ROUND((SELECT SUM(
        (SELECT SUM((item->>'quantity')::numeric * (item->>'price')::numeric)
         FROM jsonb_array_elements(items) as item)
    ) FROM public.orders), 2) as "Ingresos Totales $";

GRANT SELECT ON orders_summary TO authenticated;
