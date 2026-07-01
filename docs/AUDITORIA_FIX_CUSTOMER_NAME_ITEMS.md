# Auditoria fix customer_name e items de pedidos

Fecha: 2026-06-30

## Contexto

Se investigo un pedido archivado con `customer_name = "125"` y `total_items = 2` para un almuerzo de Padre Bueno con:

- `Menu principal - Pastel de papas`
- `Opcion 5 - Ensalada Candelita`

El caso mezclaba dos problemas:

1. Un nombre de cliente numerico fue persistido como si fuera nombre real.
2. Un pedido de almuerzo historico tenia dos items, incluyendo Opcion 5 / Ensalada como item acumulado.

## Commits auditados

- `4d1073fa mejoras`: fix de almuerzo exclusivo y defensas de items.
- `95bed7ba mejoras`: fix de validacion/resolucion de `customer_name` y advertencia en daily-orders.

## Causa raiz

### customer_name numerico

`src/utils/order/orderPayload.js` usaba `formData.name` antes que `user.user_metadata.full_name`.
Si el formulario traia un legajo, codigo o numero puro como `125`, ese valor se persistia en `orders.customer_name`.

### items duplicados en almuerzo

Antes del fix, `useOrderLunchSelection` trataba ensaladas como excepcion y permitia acumular Opcion 5 con otro menu.
El array final se armaba desde `selectedItems` y terminaba persistido en `orders.items`.

## Cambios implementados

### Resolucion segura de nombre

Archivo nuevo:

- `src/utils/order/orderCustomerName.js`

Reglas:

- Rechaza valores vacios.
- Rechaza valores puramente numericos.
- Exige al menos una letra.
- Busca fallback valido en:
  - `formData.name`
  - `user.profile.full_name/name/display_name`
  - `user.person.full_name/name/display_name`
  - `user.full_name/name/display_name`
  - `user.user_metadata.full_name/name/display_name`

### Validacion antes de enviar

Archivo:

- `src/utils/order/orderValidation.js`

Ahora bloquea el submit si no puede resolver un nombre real:

`No pudimos validar tu nombre. Completá tu nombre real en el perfil antes de enviar el pedido.`

Tambien mantiene las defensas:

- lunch no puede tener mas de 1 item.
- dinner no puede tener mas de 1 item.
- guarnicion distinta se bloquea si el menu no la permite.
- guarnicion permitida mantiene metadata `item_id`, `itemId`, `itemName`, `slotIndex`, `service`.

### Payload final a Supabase

Archivo:

- `src/utils/order/orderPayload.js`

Ahora:

- `customer_name` sale de `resolveCustomerName`.
- `itemsForService` se limita defensivamente a 1 item.
- `total_items` se calcula desde `normalizedItemsToSend.length`.
- bebidas/postres siguen en `custom_responses`, no en `items`.

### Edicion de pedidos

Archivo:

- `src/utils/orderEdit/buildEditOrderPayload.js`

Usa la misma resolucion de nombre para no reintroducir nombres numericos desde el flujo de edicion.

### Daily orders / exportaciones

Archivo:

- `src/utils/daily/dailyOrdersExportModel.js`

No maquilla nombres invalidos.
Si un historico trae `customer_name` numerico, agrega inconsistencia:

`Cliente inválido`

Esto permite que Excel/WhatsApp/daily-orders reflejen el dato y la auditoria lo marque como problema, sin ocultarlo silenciosamente.

## Tests agregados o ajustados

Archivos:

- `src/utils/order/orderValidation.test.js`
- `src/utils/order/orderPayload.test.js`
- `src/utils/daily/dailyOrdersExportModel.test.js`
- `src/hooks/orderForm/useOrderLunchSelection.test.js`

Cobertura relevante:

- `customer_name` numerico usa fallback valido si existe.
- `customer_name` numerico sin fallback valido bloquea el envio.
- Opcion 5 reemplaza seleccion previa.
- lunch con 2 items queda bloqueado.
- payload persiste como maximo 1 item.
- `total_items` coincide con `items.length`.
- bebidas/postres Genneia siguen en `custom_responses`.
- cliente numerico historico se reporta como inconsistencia.

## Estado de validacion

Validaciones ejecutadas durante el cierre del fix:

- `npm run test`: paso, 9 test files / 71 tests.
- `npm run lint`: paso.
- `npm run build`: paso.
- `git diff --check`: paso.

El build mantiene warnings conocidos de Vite sobre imports dinamicos/chunks grandes; no estan relacionados con este fix.

## Riesgos y observaciones

- Los pedidos historicos archived no se modifican.
- El pedido historico con `customer_name = "125"` seguira mostrando el valor real almacenado, pero ahora daily-orders lo puede marcar como `Cliente inválido`.
- Si un usuario no tiene nombre real en metadata/perfil y escribe un numero en el formulario, el envio queda bloqueado.
- Si un usuario tiene nombre real en metadata/perfil y el formulario trae un numero, el payload usa el nombre real.
- No se tocaron SQL, migraciones, Edge Functions, autoarchivado, reportes automaticos, `package.json` ni deploy.

## Checklist manual recomendado

En `servifoodapp.site`:

1. Entrar con un usuario que tenga `full_name` valido.
2. Intentar enviar pedido con nombre del formulario numerico: debe persistir el nombre real del perfil/metadata.
3. Probar usuario sin nombre real valido: el envio debe bloquearse con error claro.
4. Seleccionar menu normal y luego Opcion 5: debe quedar solo Opcion 5.
5. Seleccionar Opcion 5 y luego menu normal: debe quedar solo el menu normal.
6. En Genneia, cargar bebida/postre: deben ir en `custom_responses`, no sumar items.
7. Con menu que no acepta guarnicion, intentar guarnicion distinta: no debe persistirse.
8. Con menu que acepta guarnicion, confirmar que se guarda con metadata.
9. Revisar `/daily-orders`, Excel y WhatsApp: no deben duplicar almuerzos ni inflar `total_items`.

## Conclusion

El bug de `customer_name` numerico queda corregido por validacion previa y resolucion segura en payload.
El bug de almuerzo con Menu principal + Opcion 5 queda cubierto por seleccion exclusiva, validacion, submit y payload defensivo.
El estado es apto para produccion, sujeto al checklist manual en sitio real.
