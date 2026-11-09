# Tareas de Implementación — Spec 006 (Metas de Ahorro Personal)

- [x] **T1: TDD Red (Pruebas unitarias de metas de ahorro)**
  - Crear archivo `tests/goals.test.js` con pruebas para `validarMetaAhorro`, `calcularProgresoMeta` y `aplicarAporteMeta`.
  - Ejecutar `node --test tests/goals.test.js` y confirmar fallo controlado (fase Red).

- [x] **T2: TDD Green (Implementación de lógica pura)**
  - Implementar las funciones puras en `assets/js/financeCalculations.js`.
  - Exportarlas en `window.ContaPersonal` y `module.exports`.
  - Ejecutar `node --test tests/*.test.js` y confirmar que todas las suites pasen en verde.

- [x] **T3: Planilla interactiva de Nueva/Editar Meta en `assets/js/app.js`**
  - Implementar `openGoalModal(goalIdToEdit)`.
  - Conectar el botón `btn-modal-new-goal` para abrir la planilla modal.
  - Soportar creación y edición de metas de ahorro.
  - Persistir en `Storage.saveGoals()`.

- [x] **T4: Modal de Aporte Rápido y Tarjetas de Meta Mejoradas**
  - Implementar `openContributeGoalModal(goalId)` para registrar abonos/aportes a una meta.
  - Renderizar tarjetas de meta con barra de progreso, indicador de monto restante o badge "¡Meta Cumplida! 🏆", y botones "+ Aportar", "Editar" y "Eliminar".

- [x] **T5: Verificación en navegador y sincronización de gobernanza**
  - Validar flujo en vivo mediante Chrome DevTools MCP (crear meta, aportar, editar y eliminar).
  - Marcar DoD en `specs/006-metas-ahorro/spec.md`.
  - Actualizar `memory.md` con la nueva funcionalidad y decisiones.
  - Commit git de la Spec 006.
