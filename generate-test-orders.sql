-- ============================================
-- GENERACIÓN DE PEDIDOS DE PRUEBA PARA SERVIFOOD
-- ============================================
-- Este script genera pedidos masivos con datos realistas
-- IMPORTANTE: Ejecutar DESPUÉS de tener usuarios de prueba
-- ============================================

-- Primero, verificar que tenemos usuarios de prueba
SELECT COUNT(*) as total_usuarios_prueba 
FROM public.users 
WHERE email LIKE '%@servifood.test';

-- ============================================
-- FUNCIÓN PARA GENERAR PEDIDOS ALEATORIOS
-- ============================================

CREATE OR REPLACE FUNCTION generate_test_orders(num_orders INTEGER DEFAULT 500)
RETURNS INTEGER AS $$
DECLARE
  usuarios_ids UUID[];
  usuario_id UUID;
  orden_count INTEGER := 0;
  
  -- Datos realistas para pedidos
  ubicaciones TEXT[] := ARRAY[
    'Av. Libertador 1234, CABA',
    'Calle Corrientes 5678, CABA',
    'Av. Rivadavia 910, CABA',
    'San Martín 234, Vicente López',
    'Belgrano 567, San Isidro',
    'Mitre 890, Olivos',
    'Sarmiento 123, Martinez',
    'Maipú 456, Florida',
    'Santa Fe 789, Palermo',
    'Cabildo 1011, Belgrano',
    'Las Heras 1213, Recoleta',
    'Callao 1415, Barrio Norte'
  ];
  
  nombres_clientes TEXT[] := ARRAY[
    'Juan Pérez', 'María González', 'Carlos Rodríguez', 'Ana Martínez',
    'Luis García', 'Carmen López', 'Pedro Sánchez', 'Laura Torres',
    'Miguel Flores', 'Sofia Ramírez', 'Diego Morales', 'Elena Reyes'
  ];
  
  platos JSONB[] := ARRAY[
    '{"name": "Milanesa con Papas Fritas", "price": 2500, "quantity": 1}'::jsonb,
    '{"name": "Empanadas de Carne (docena)", "price": 3000, "quantity": 1}'::jsonb,
    '{"name": "Pizza Muzzarella", "price": 3500, "quantity": 1}'::jsonb,
    '{"name": "Hamburguesa Completa", "price": 2800, "quantity": 1}'::jsonb,
    '{"name": "Ensalada César", "price": 2200, "quantity": 1}'::jsonb,
    '{"name": "Pasta Bolognesa", "price": 2600, "quantity": 1}'::jsonb,
    '{"name": "Pollo al Horno con Verduras", "price": 3200, "quantity": 1}'::jsonb,
    '{"name": "Sándwich de Jamón y Queso", "price": 1800, "quantity": 1}'::jsonb,
    '{"name": "Tacos Mexicanos (3 unidades)", "price": 2400, "quantity": 1}'::jsonb,
    '{"name": "Sushi Roll (10 piezas)", "price": 4000, "quantity": 1}'::jsonb,
    '{"name": "Coca Cola 1.5L", "price": 800, "quantity": 1}'::jsonb,
    '{"name": "Agua Mineral 500ml", "price": 500, "quantity": 1}'::jsonb,
    '{"name": "Cerveza Artesanal", "price": 1200, "quantity": 1}'::jsonb,
    '{"name": "Flan Casero", "price": 900, "quantity": 1}'::jsonb,
    '{"name": "Helado (1/4 kg)", "price": 1500, "quantity": 1}'::jsonb
  ];
  
  estados TEXT[] := ARRAY['pending', 'processing', 'completed', 'delivered', 'cancelled'];
  
  comentarios_opciones TEXT[] := ARRAY[
    'Por favor, sin cebolla',
    'Entregar en recepción del edificio',
    'Llamar al llegar',
    'Sin sal adicional',
    'Bien cocido por favor',
    'Con extra de queso',
    '',
    '',
    'Dejar en portería',
    'Casa con portón verde'
  ];
  
  items_pedido JSONB;
  num_items INTEGER;
  total_items_pedido INTEGER;
  ubicacion TEXT;
  nombre_cliente TEXT;
  email_cliente TEXT;
  telefono_cliente TEXT;
  comentario TEXT;
  estado TEXT;
  fecha_entrega DATE;
  fecha_creacion TIMESTAMP;
  i INTEGER;
  j INTEGER;
  item_actual JSONB;
  cantidad_item INTEGER;
  
BEGIN
  -- Obtener todos los IDs de usuarios de prueba
  SELECT ARRAY_AGG(id) INTO usuarios_ids
  FROM public.users
  WHERE email LIKE '%@servifood.test'
  LIMIT 1000;
  
  IF usuarios_ids IS NULL OR array_length(usuarios_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No hay usuarios de prueba. Ejecuta primero el script de crear usuarios.';
  END IF;
  
  -- Generar los pedidos
  FOR i IN 1..num_orders LOOP
    -- Seleccionar usuario aleatorio
    usuario_id := usuarios_ids[1 + floor(random() * array_length(usuarios_ids, 1))];
    
    -- Generar datos del pedido
    ubicacion := ubicaciones[1 + floor(random() * array_length(ubicaciones, 1))];
    nombre_cliente := nombres_clientes[1 + floor(random() * array_length(nombres_clientes, 1))];
    email_cliente := 'cliente' || i || '@example.com';
    telefono_cliente := '+54911' || LPAD(floor(random() * 90000000 + 10000000)::TEXT, 8, '0');
    comentario := comentarios_opciones[1 + floor(random() * array_length(comentarios_opciones, 1))];
    
    -- Estado (80% pending/processing, 15% completed/delivered, 5% cancelled)
    CASE 
      WHEN random() < 0.5 THEN estado := 'pending';
      WHEN random() < 0.8 THEN estado := 'processing';
      WHEN random() < 0.95 THEN estado := 'completed';
      WHEN random() < 0.99 THEN estado := 'delivered';
      ELSE estado := 'cancelled';
    END CASE;
    
    -- Fecha de entrega (entre hoy y 7 días en el futuro)
    fecha_entrega := CURRENT_DATE + (floor(random() * 7)::INTEGER);
    
    -- Fecha de creación (últimos 30 días)
    fecha_creacion := NOW() - (floor(random() * 30) || ' days')::INTERVAL;
    
    -- Generar items del pedido (entre 1 y 5 items)
    num_items := 1 + floor(random() * 4)::INTEGER;
    items_pedido := '[]'::jsonb;
    total_items_pedido := 0;
    
    FOR j IN 1..num_items LOOP
      -- Seleccionar plato aleatorio
      item_actual := platos[1 + floor(random() * array_length(platos, 1))];
      
      -- Cantidad aleatoria (1-3 unidades)
      cantidad_item := 1 + floor(random() * 2)::INTEGER;
      
      -- Actualizar cantidad en el item
      item_actual := jsonb_set(item_actual, '{quantity}', to_jsonb(cantidad_item));
      
      -- Agregar al array de items
      items_pedido := items_pedido || item_actual;
      total_items_pedido := total_items_pedido + cantidad_item;
    END LOOP;
    
    -- Insertar el pedido
    INSERT INTO public.orders (
      user_id,
      location,
      customer_name,
      customer_email,
      customer_phone,
      items,
      comments,
      delivery_date,
      status,
      total_items,
      created_at,
      updated_at
    ) VALUES (
      usuario_id,
      ubicacion,
      nombre_cliente,
      email_cliente,
      telefono_cliente,
      items_pedido,
      NULLIF(comentario, ''),
      fecha_entrega,
      estado,
      total_items_pedido,
      fecha_creacion,
      fecha_creacion
    );
    
    orden_count := orden_count + 1;
    
    -- Mostrar progreso cada 100 pedidos
    IF orden_count % 100 = 0 THEN
      RAISE NOTICE 'Generados % pedidos...', orden_count;
    END IF;
  END LOOP;
  
  RETURN orden_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJECUTAR LA GENERACIÓN DE PEDIDOS
-- ============================================

-- Generar 500 pedidos de prueba
SELECT generate_test_orders(500) as pedidos_creados;

-- ============================================
-- VERIFICAR LOS PEDIDOS GENERADOS
-- ============================================

-- Ver resumen por estado
SELECT 
  status,
  COUNT(*) as cantidad,
  ROUND(AVG(total_items), 2) as promedio_items,
  COUNT(DISTINCT user_id) as usuarios_unicos
FROM public.orders
GROUP BY status
ORDER BY cantidad DESC;

-- Ver resumen por día de creación
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as pedidos,
  ROUND(AVG(total_items), 2) as promedio_items
FROM public.orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- Ver usuarios más activos
SELECT 
  u.full_name,
  u.email,
  COUNT(o.id) as total_pedidos,
  SUM(o.total_items) as total_items
FROM public.users u
JOIN public.orders o ON u.id = o.user_id
WHERE u.email LIKE '%@servifood.test'
GROUP BY u.id, u.full_name, u.email
ORDER BY total_pedidos DESC
LIMIT 10;

-- ============================================
-- GENERAR MÁS PEDIDOS SI ES NECESARIO
-- ============================================

-- Para 1000 pedidos más:
-- SELECT generate_test_orders(1000) as pedidos_creados;

-- Para 5000 pedidos más:
-- SELECT generate_test_orders(5000) as pedidos_creados;

-- ============================================
-- LIMPIAR PEDIDOS DE PRUEBA (CUIDADO!)
-- ============================================
-- Solo ejecutar si quieres eliminar todos los pedidos de prueba
-- DESCOMENTAR SOLO SI ESTÁS SEGURO:

-- DELETE FROM public.orders 
-- WHERE user_id IN (
--   SELECT id FROM public.users WHERE email LIKE '%@servifood.test'
-- );

-- ============================================
-- ESTADÍSTICAS COMPLETAS
-- ============================================

SELECT 
  'Total Pedidos' as metrica,
  COUNT(*)::TEXT as valor
FROM public.orders
UNION ALL
SELECT 
  'Total Items Pedidos',
  SUM(total_items)::TEXT
FROM public.orders
UNION ALL
SELECT 
  'Pedidos Hoy',
  COUNT(*)::TEXT
FROM public.orders
WHERE DATE(created_at) = CURRENT_DATE
UNION ALL
SELECT 
  'Usuarios con Pedidos',
  COUNT(DISTINCT user_id)::TEXT
FROM public.orders;
