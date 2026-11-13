# Tareas de Implementación — Spec 010 (Plan de Cuentas CRUD)

- [x] **T1: TDD Red (Pruebas unitarias de lógica pura del Plan de Cuentas)**
  - Crear archivo `tests/chart-of-accounts.test.js`.
  - Probar `clasificarPlanDeCuentas` con grupos 1 (Activos) y 2 (Pasivos) y subtotales.
  - Probar `validarEdicionCuenta` validando nombres duplicados vs misma cuenta.
  - Probar `puedeEliminarCuenta` evaluando la existencia de transacciones asociadas.
  - Ejecutar `node --test tests/chart-of-accounts.test.js` y confirmar fallo controlado (fase Red).

- [x] **T2: TDD Green (Implementación de funciones puras en `financeCalculations.js`)**
  - Implementar `clasificarPlanDeCuentas`, `validarEdicionCuenta` y `puedeEliminarCuenta`.
  - Exportar las funciones en `window.ContaPersonal` y `module.exports`.
  - Ejecutar `node --test tests/*.test.js` y confirmar que todas las suites pasen en verde.

- [x] **T3: Actualización de la Interfaz en `index.html`**
  - Añadir botón de navegación "Plan de Cuentas" en el menú vertical justo debajo de "Cuentas & Billeteras".
  - Crear la sección `<section id="view-chart-of-accounts" class="hidden space-y-5">`.

- [x] **T4: Integración del CRUD en `assets/js/app.js`**
  - Registrar `"chart-of-accounts"` en `VIEW_METADATA` y `switchView()`.
  - Implementar `renderChartOfAccounts()` con búsqueda y filtros por grupo.
  - Implementar `openAccountEditModal(accountId)` para actualizar cuentas existentes.
  - Conectar eliminación con advertencia si tiene movimientos y sincronización reactiva en `state.accounts` y `Storage`.

- [x] **T5: Verificación en navegador y sincronización de gobernanza**
  - Probar en navegador la navegación desde el menú vertical.
  - Probar Create, Read, Update y Delete de cuentas.
  - Marcar DoD en `specs/010-plan-de-cuentas-crud/spec.md`.
  - Actualizar `memory.md` y realizar commit git.
