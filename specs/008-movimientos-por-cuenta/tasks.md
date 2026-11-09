# Tareas de Implementación — Spec 008 (Movimientos por Cuenta)

- [x] **T1: TDD Red (Pruebas unitarias de movimientos por cuenta)**
  - Crear archivo `tests/account-details.test.js`.
  - Probar `obtenerMovimientosDeCuenta` con transacciones estándar, transferencias recibidas y partidas split.
  - Probar `calcularResumenCuenta` con abonos, cargos y saldo de movimientos.
  - Ejecutar `node --test tests/account-details.test.js` y confirmar fallo controlado (fase Red).

- [x] **T2: TDD Green (Implementación de lógica pura)**
  - Implementar `obtenerMovimientosDeCuenta` y `calcularResumenCuenta` en `assets/js/financeCalculations.js`.
  - Exportar las funciones en `window.ContaPersonal` y `module.exports`.
  - Ejecutar `node --test tests/*.test.js` y confirmar que todas las suites pasen en verde.

- [x] **T3: Actualización de Interfaz en `index.html`**
  - Añadir contenedor `#account-detail-panel` dentro de `view-accounts` debajo de `#accounts-grid`.

- [x] **T4: Integración interactiva en `assets/js/app.js`**
  - Añadir `state.selectedAccountId = null`.
  - Hacer las tarjetas de cuenta interactivas con `cursor-pointer`, `ring-2` y clase de estado activo.
  - Renderizar dinámicamente `#account-detail-panel` con KPIs rápidos, desglose de movimientos y botón de cierre.
  - Gestionar selección / deselección con un solo clic.

- [x] **T5: Verificación en navegador y sincronización de gobernanza**
  - Probar selección de múltiples cuentas en vivo mediante Chrome DevTools MCP.
  - Verificar visualización de transferencias y movimientos split.
  - Marcar DoD en `specs/008-movimientos-por-cuenta/spec.md`.
  - Actualizar `memory.md` y realizar commit git.
