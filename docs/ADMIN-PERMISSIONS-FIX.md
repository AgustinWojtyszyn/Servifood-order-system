# 🔧 Permisos de administradores (Supabase RLS) — estado real

## Estado del documento

- No implementado (repo): no existe `fix-admin-permissions.sql` ni políticas RLS versionadas para permisos admin.
- Implementado (app): la UI distingue admins consultando `public.users.role` vía `usersService`.
- Requiere configuración externa: el acceso real a datos depende de RLS/policies en Supabase.

---

## Implementado — Qué asume la app

- Existe una tabla `public.users` con un campo `role`.
- Un usuario es admin si `role === 'admin'` (verificación vía `usersService`).

> Importante: aunque la UI habilite tabs/acciones, si RLS no está bien configurado en Supabase esas operaciones pueden fallar (o, peor, quedar demasiado permisivas).

---

## Ejemplo — Qué policies suelen necesitar los admins

Este repo no trae SQL listo, pero típicamente se define (en Supabase):

- `orders`: admins pueden `SELECT/INSERT/UPDATE/DELETE` según reglas de negocio.
- `menu_items`: admins pueden gestionar menú.
- `custom_options` y overrides: admins pueden gestionar opciones y reglas de visibilidad.

Verificación de rol típica (ejemplo conceptual):

```sql
EXISTS (
  SELECT 1 FROM public.users
  WHERE id = auth.uid() AND role = 'admin'
)
```

---

## Checklist mínimo

- [ ] Confirmar que el rol admin se guarda en `public.users.role`.
- [ ] Revisar/ajustar RLS en Supabase para las tablas usadas por el panel admin.
- [ ] Probar operaciones: menú, opciones, archivado/borrado (cleanup), exportaciones.

---

**Última actualización de este doc:** 2026-04-16
