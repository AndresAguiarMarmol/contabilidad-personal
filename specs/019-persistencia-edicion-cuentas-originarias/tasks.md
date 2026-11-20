# Tareas — Spec 019: Persistencia y Precedencia en Modificación de Cuentas Originarias del Plan de Cuentas

- [x] **Fase 1: TDD Red (Pruebas Unitarias Fallidas)**
  - [x] Crear `tests/plan-accounts-custom.test.js` con pruebas que demuestren el fallo de regeneración y validen la sobrescritura.
  - [x] Ejecutar `node --test tests/plan-accounts-custom.test.js` y confirmar fallo (Red).

- [x] **Fase 2: TDD Green (Lógica Pura de Cálculo)**
  - [x] Modificar `obtenerCatalogoPlanCuentas` en `assets/js/financeCalculations.js` para reemplazar/actualizar cuentas base coincidentes por `id`, `code` o `baseCode`.
  - [x] Respetar `codigoContable` asignado a cuentas financieras vinculadas.
  - [x] Ejecutar `node --test tests/plan-accounts-custom.test.js` y verificar éxito (Green).

- [x] **Fase 3: Capa de Interfaz y Aplicación**
  - [x] Habilitar en `openPlanAccountModal` la edición de nombre, grupo, naturaleza y código de cuentas originarias.
  - [x] Preservar `id` y `baseCode` al guardar en `state.planAccounts`.
  - [x] Asegurar que selectores de categorías (`tx-input-category`, presupuestos) usen el catálogo reactivo actualizado.

- [x] **Fase 4: Verificación Integral**
  - [x] Ejecutar suite completa `node --test tests/*.test.js` y confirmar 100% pruebas en verde (92/92).
  - [x] Comprobar que no hay regresiones en cuentas financieras ni en sincronización.

- [x] **Fase 5: Documentación y Despliegue**
  - [x] Actualizar `memory.md` (Sección 2 y Sección 3).
  - [x] Marcar checklist en `tasks.md`.
  - [x] Realizar commit y push a GitHub (`main`).
