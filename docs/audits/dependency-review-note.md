
# Dependency review note

## Objetivo

Registrar dependencias y archivos que merecen revisión antes de cualquier limpieza técnica adicional.

## No tocar todavía sin auditoría extra

- `server.js`
- `testing/`
- `src/assets/`
- `.env*`
- `dist/`

## Posibles candidatos a revisión futura

- Dependencias sin imports visibles en `src/`
- Scripts auxiliares fuera del flujo principal
- Configuraciones legacy que no participen del build ni del deploy
- `@unlighthouse/cli`: concentra vulnerabilidades moderadas transitivas de OpenTelemetry y `js-yaml`. `npm audit fix --force` propone bajar a `@unlighthouse/cli@0.10.6`, lo que es un cambio potencialmente rompedor para el tooling de auditoria.
- `exceljs`: arrastra `uuid@8`. `npm audit fix --force` propone bajar `exceljs` a `3.4.0`, lo que tambien es potencialmente rompedor para exportaciones Excel existentes.

## Estado audit 2026-06-19

- `nodemailer` fue actualizado a `9.0.1` y se cerro la vulnerabilidad high.
- `esbuild` queda forzado por `overrides` a `^0.28.1` para evitar la vulnerabilidad moderada reportada.
- Persisten vulnerabilidades moderadas transitivas donde npm solo ofrece `--force` con cambios de ruptura. No se aplico `--force` para no arriesgar build, exportaciones ni tooling.

## Criterio de limpieza

Antes de eliminar o mover cualquier archivo o dependencia:
- confirmar que no participa del runtime
- confirmar que no participa del deploy
- confirmar que no participa de flujos manuales de trabajo
- priorizar cambios pequeños, reversibles y de bajo riesgo
