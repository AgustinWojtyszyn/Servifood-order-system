
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

## Criterio de limpieza

Antes de eliminar o mover cualquier archivo o dependencia:
- confirmar que no participa del runtime
- confirmar que no participa del deploy
- confirmar que no participa de flujos manuales de trabajo
- priorizar cambios pequeños, reversibles y de bajo riesgo
