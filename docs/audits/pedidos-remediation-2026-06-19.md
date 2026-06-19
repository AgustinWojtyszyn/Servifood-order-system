# Remediacion pedidos - 2026-06-19

## Estado actual

La app mantiene el flujo principal de pedidos sin cambios en auth, RLS, RPCs, estados `pending`/`archived`, Daily Orders, Monthly Panel, Landing ni roles admin.

El deploy actual de Render sirve frontend estatico con `npx serve -s dist -l ${PORT:-3000} --single`. `server.js` existe en el repositorio, pero no forma parte del runtime vigente.

## Riesgos resueltos en este fix

- `/excel-analysis` ya no ejecuta el componente que llama a `/api/upload-excel` por defecto. La ruta muestra una pantalla de funcion temporalmente deshabilitada hasta migrar el procesamiento a Supabase Edge Function o backend real.
- Se reforzo la nota tecnica de `server.js` para evitar reactivacion accidental en Render sin dependencias, seguridad y limites de upload.
- `nodemailer` se actualizo a una version corregida para cerrar la vulnerabilidad high reportada por `npm audit`.
- Los warnings de lint existentes se limpiaron separando exports auxiliares y estabilizando dependencias de hooks.
- Los deletes bulk de pedidos archivados se movieron a RPC admin-only auditada con conteo retornado.
- La policy amplia `users_select_auth` se reemplaza por lectura propia o admin en una migracion nueva.
- `create_order_idempotent` suma validaciones server-side minimas para servicio, items, fecha, ventana horaria y cena habilitada.
- Se agrego una suite minima de tests unitarios para payload, idempotencia, cena y guarniciones.
- `esbuild` queda forzado por override a una version corregida para reducir el audit sin `--force`.

## Riesgos pendientes

1. Unificar completamente `services/orders` y `services/users`.
   - Prioridad: media-alta.
   - Motivo: en este fix se alinearon operaciones criticas de pedidos con RPCs, pero aun conviven fachadas (`db` desde `supabaseClient.js` y servicios dedicados) por compatibilidad con pantallas existentes.

2. Completar deletes admin restantes a RPC auditadas.
   - Prioridad: media.
   - Motivo: el bulk delete de archivados ya usa RPC auditada. Quedan operaciones individuales o de otros dominios que pueden auditarse con el mismo patron.

3. Verificar en staging la nueva RLS de usuarios.
   - Prioridad: alta.
   - Motivo: la migracion restringe lectura a perfil propio o admin. Debe validarse con usuarios reales antes de despliegue definitivo.

4. Completar reglas obligatorias de negocio en DB/RPC.
   - Prioridad: media-alta.
   - Motivo: duplicado activo, servicio, horario y cena habilitada quedan cubiertos en `create_order_idempotent`. Falta validar server-side opciones visibles por fecha/compania/servicio sin redisenar el flujo.

5. Agregar tests de integracion.
   - Prioridad: media.
   - Motivo: ya hay tests unitarios minimos. Falta cubrir Supabase local para RLS, RPC de creacion, cancelacion y deletes auditados.

6. Optimizar bundle y assets.
   - Prioridad: media.
   - Motivo: el build advierte chunk inicial grande y assets pesados. No se convirtieron imagenes porque el entorno no tiene `cwebp`, `magick` ni `convert`.

## Prioridad sugerida

1. Consolidar servicios de pedidos/usuarios y encapsular operaciones sensibles.
2. Crear RPCs auditadas para bulk/delete admin.
3. Endurecer RLS de `users`.
4. Migrar reglas obligatorias de pedido a DB/RPC.
5. Agregar suite minima de tests.
6. Atacar performance de bundle/assets.
