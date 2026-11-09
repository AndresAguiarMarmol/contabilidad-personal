# Tareas de Implementación — Spec 005 (Presupuestos Mensuales)

- [x] **T1: TDD Red (Pruebas unitarias de presupuestos)**
  - Crear archivo `tests/budgets.test.js` con pruebas para `validarPresupuesto`, `calcularGastoCategoriaMes` y `sincronizarPresupuestosConTransacciones`.
  - Ejecutar `node --test tests/budgets.test.js` y confirmar fallo controlado (fase Red).

- [x] **T2: TDD Green (Implementación de lógica pura)**
  - Implementar las funciones puras en `assets/js/financeCalculations.js`.
  - Exportarlas en `window.ContaPersonal` y `module.exports`.
  - Ejecutar `node --test tests/*.test.js` y confirmar que las 5 suites pasen en verde.

- [x] **T3: Planilla interactiva de Nuevo/Editar Presupuesto en `assets/js/app.js`**
  - Implementar `openBudgetModal(budgetIdToEdit)`.
  - Conectar el botón `btn-modal-new-budget` para abrir la planilla.
  - Soportar creación y edición de límites mensuales.
  - Sincronizar dinámicamente el `spentAmount` con las transacciones registradas del mes.
  - Persistir en `Storage.saveBudgets()`.

- [x] **T4: Tarjetas de Presupuesto mejoradas con acciones de edición/eliminación**
  - Renderizar en cada tarjeta: barra de progreso, semáforo visual (verde/amarillo/rojo), saldo disponible restante o sobregiro.
  - Añadir botones de "Editar" y "Eliminar".
  - Enlazar acción de eliminar con confirmación y refresco reactivo.

- [x] **T5: Verificación en navegador y sincronización de gobernanza**
  - Validar flujo en vivo mediante Chrome DevTools MCP (crear presupuesto, verificar semáforo, editar y eliminar).
  - Marcar DoD en `specs/005-gestion-presupuestos/spec.md`.
  - Actualizar `memory.md` con la nueva funcionalidad y decisiones.
  - Commit git de la Spec 005.
