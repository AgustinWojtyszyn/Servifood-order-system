-- ============================================
-- AGREGAR TABLA DE OPCIONES PERSONALIZABLES
-- ============================================
-- Ejecuta este script en Supabase SQL Editor

-- Tabla para opciones personalizables (preguntas de opción múltiple, encuestas, etc.)
CREATE TABLE IF NOT EXISTS public.custom_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'text', 'checkbox')),
  options JSONB, -- Para multiple_choice y checkbox: array de opciones
  company TEXT, -- Slug de la empresa (null = visible para todas)
  required BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  order_position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Asegurar columna en instalaciones existentes
ALTER TABLE public.custom_options ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.custom_options ADD COLUMN IF NOT EXISTS dinner_only BOOLEAN DEFAULT false;

-- Habilitar RLS
ALTER TABLE public.custom_options ENABLE ROW LEVEL SECURITY;

-- Políticas: todos pueden ver, solo admins pueden modificar
DROP POLICY IF EXISTS "Everyone can view custom options" ON public.custom_options;
DROP POLICY IF EXISTS "Only admins can modify custom options" ON public.custom_options;
CREATE POLICY "Everyone can view custom options"
  ON public.custom_options FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify custom options"
  ON public.custom_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Agregar columna para respuestas personalizadas en orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS custom_responses JSONB DEFAULT '[]'::jsonb;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_custom_options_active ON public.custom_options(active);
CREATE INDEX IF NOT EXISTS idx_custom_options_order ON public.custom_options(order_position);
CREATE INDEX IF NOT EXISTS idx_custom_options_company ON public.custom_options(company);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_custom_options_company_title_type ON public.custom_options (company, lower(title), type);

-- Insertar opciones de ejemplo
INSERT INTO public.custom_options (title, type, options, required, active, order_position, company) VALUES
('Bebidas (solo Genneia)', 'multiple_choice', '["Agua", "Soda", "Agua saborizada", "Coca cola"]'::jsonb, false, true, 1, 'genneia'),
('Postre (solo Genneia)', 'multiple_choice', '["Postre del día (solo martes y jueves)", "Fruta"]'::jsonb, false, true, 2, 'genneia'),
('¿Desea alguna guarnición distinta a la del menú?', 'multiple_choice', '["Papas fritas", "Arroz", "Verduras", "Puré", "Fideos"]'::jsonb, false, true, 1, 'genneia')
ON CONFLICT (company, lower(title), type) DO UPDATE
SET
  options = EXCLUDED.options,
  required = EXCLUDED.required,
  active = EXCLUDED.active,
  order_position = EXCLUDED.order_position,
  updated_at = TIMEZONE('utc'::text, NOW());

-- Verificar
SELECT * FROM public.custom_options ORDER BY order_position;
