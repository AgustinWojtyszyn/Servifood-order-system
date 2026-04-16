# 🔧 Solución: error al actualizar el menú (RLS / update diff)

## Estado del documento

- Implementado: actualización “diff” del menú (update/insert/delete por fecha) en `src/services/menu/menuService.js`.
- No implementado (repo): no existe `fix-menu-permissions.sql` versionado.
- Depende de Supabase: si falla por permisos, es un tema de RLS/policies externas al repo.

---

## Problema típico

Admins pueden ver el menú pero al guardar aparece “Error al actualizar el menú”.

## Implementado — Actualización por fecha (diff)

El flujo de update del menú por día está en:

- `src/services/menu/menuService.js` → `updateMenuItemsByDate(menuDate, menuItems, requestId)`

Resumen de la lógica:

1) Fetch de ids existentes para `menu_date`  
2) Determina `itemsToUpdate`, `itemsToInsert`, `itemsToDelete`  
3) `DELETE` de removidos (solo del día)  
4) `UPDATE` item por item (solo del día)  
5) `INSERT` de nuevos (con `menu_date`)  
6) Refetch final del día

## Ejemplo — Qué revisar en Supabase (RLS)

Si el error es de permisos:

- Revisar que `menu_items` tenga policies para admin (SELECT/INSERT/UPDATE/DELETE).
- Confirmar que la app reconoce admins por `public.users.role = 'admin'`.

> El repo no versiona policies RLS, por lo que la verificación y el ajuste se hacen en Supabase Dashboard.

## Checklist de prueba

- [ ] Entrar como admin.
- [ ] Abrir Admin Panel → Menú.
- [ ] Editar un plato existente y guardar.
- [ ] Agregar uno nuevo y guardar.
- [ ] Eliminar uno y guardar.

## Troubleshooting

- Si falla solo `DELETE`: revisar policy DELETE.
- Si falla solo `INSERT`: revisar policy INSERT.
- Si falla `UPDATE`: revisar policy UPDATE.
- Si falla al listar: revisar policy SELECT.

---

**Última actualización de este doc:** 2026-04-16

