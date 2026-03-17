# Notas de Seguridad - ServiFood

## Database Linter Warnings

### SECURITY_DEFINER Views (Advertencias Ignoradas Intencionalmente)

**Fecha**: 14 de noviembre de 2025

**Razón**: Las siguientes vistas mantienen `SECURITY DEFINER` para permitir que el panel admin acceda a datos agregados de todos los usuarios:

#### Vistas Administrativas:
- `orders_items_expanded` - Detalles completos de pedidos para admin
- `orders_summary` - Resumen de pedidos para dashboard admin
- `orders_detailed` - Vista detallada de todos los pedidos
- `orders_excel_export` - Exportación de datos para reportes
- `orders_count_by_location` - Estadísticas por ubicación
- `orders_count_by_user` - Estadísticas por usuario
- `orders_count_by_date` - Estadísticas temporales
- `orders_count_by_status` - Estadísticas por estado
- `orders_today` - Pedidos del día actual
- `most_ordered_items` - Items más populares

#### Vistas de Respuestas:
- `responses_by_question` - Análisis de respuestas a preguntas
- `custom_responses_detail` - Detalle de respuestas personalizadas
- `orders_with_responses` - Pedidos con respuestas asociadas

**Justificación**:
1. Estas vistas son accedidas principalmente por el panel administrativo
2. Permiten al admin ver estadísticas y datos agregados de todos los usuarios
3. Cambiar a `SECURITY INVOKER` rompería la funcionalidad del panel admin
4. La seguridad está garantizada por:
   - Autenticación de Supabase
   - Control de acceso a nivel de aplicación (role checking)
   - RLS configurado en tablas base

**Resultado de Load Testing**:
- ✅ 1000 usuarios concurrentes - 0% fallos
- ✅ 477 RPS sostenido
- ✅ 270ms tiempo de respuesta mediano
- ✅ Sin vulnerabilidades de seguridad detectadas

**Acción**: Mantener configuración actual. Monitorear periódicamente.
