# Remediacion pedidos - 2026-06-19

## Estado actual

La app mantiene el flujo principal de pedidos sin cambios en auth, RLS, RPCs, estados `pending`/`archived`, Daily Orders, Monthly Panel, Landing ni roles admin.

El deploy actual de Render sirve frontend estatico con `npx serve -s dist -l ${PORT:-3000} --single`. `server.js` existe en el repositorio, pero no forma parte del runtime vigente.

## Riesgos resueltos en este fix

- `/excel-analysis` ya no ejecuta el componente que llama a `/api/upload-excel` por defecto. La ruta muestra una pantalla de funcion temporalmente deshabilitada hasta migrar el procesamiento a Supabase Edge Function o backend real.
- Se reforzo la nota tecnica de `server.js` para evitar reactivacion accidental en Render sin dependencias, seguridad y limites de upload.
- `nodemailer` se actualizo a una version corregida para cerrar la vulnerabilidad high reportada por `npm audit`.

## Riesgos pendientes

1. Unificar `services/orders` y `services/users`.
   - Prioridad: alta.
   - Motivo: hoy conviven fachadas distintas (`db` desde `supabaseClient.js` y servicios dedicados), lo que puede duplicar reglas y generar comportamientos divergentes.

2. Mover deletes admin a RPC auditadas.
   - Prioridad: alta.
   - Motivo: acciones destructivas desde cliente dependen de RLS. Conviene centralizar en RPCs admin-only con auditoria, conteo previo y `request_id`.

3. Revisar RLS `users_select_auth`.
   - Prioridad: alta.
   - Motivo: la policy permite `select` amplio a cualquier usuario autenticado. Debe separarse lectura propia, vista publica minima y lectura admin.

4. Mover reglas obligatorias de negocio a DB/RPC.
   - Prioridad: media-alta.
   - Motivo: horario, habilitacion de cena, opciones visibles y restricciones de servicio no deben depender solo del frontend.

5. Agregar tests unitarios e integracion.
   - Prioridad: media.
   - Motivo: faltan pruebas automatizadas para validacion de pedidos, payload, idempotencia, cancelacion y RLS basica con Supabase local.

6. Optimizar bundle y assets.
   - Prioridad: media.
   - Motivo: el build advierte chunk inicial grande y assets pesados. Impacta carga inicial, especialmente en mobile.

## Prioridad sugerida

1. Consolidar servicios de pedidos/usuarios y encapsular operaciones sensibles.
2. Crear RPCs auditadas para bulk/delete admin.
3. Endurecer RLS de `users`.
4. Migrar reglas obligatorias de pedido a DB/RPC.
5. Agregar suite minima de tests.
6. Atacar performance de bundle/assets.
