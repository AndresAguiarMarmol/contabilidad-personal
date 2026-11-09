# Tareas de Implementación — Spec 004 (Movimientos Split)

- [x] **T1: TDD Red (Pruebas unitarias de lógica pura)**
  - Crear archivo `tests/split-transactions.test.js` con casos para `validarMovimientoSplit` y `aplicarMovimientoSplitEnCuentas`.
  - Ejecutar `node --test tests/split-transactions.test.js` y confirmar fallo controlado (fase Red).

- [x] **T2: TDD Green (Implementación de funciones puras)**
  - Implementar `validarMovimientoSplit` y `aplicarMovimientoSplitEnCuentas` en `assets/js/financeCalculations.js`.
  - Exportar funciones en el namespace `window.ContaPersonal` y `module.exports`.
  - Ejecutar `node --test tests/*.test.js` y confirmar que todas las suites pasen (fase Green).

- [x] **T3: Interfaz de usuario dinámica en `assets/js/app.js`**
  - Añadir casilla interactiva "Dividir movimiento (Split)" en `openTransactionModal()`.
  - Crear renderizador reactivo de partidas (`renderSplitLines()`) con inputs para descripción, monto, selector de categoría y selector opcional de cuenta destino.
  - Implementar botones "+ Añadir partida" y "- Eliminar partida" (garantizando mínimo 2 partidas).
  - Implementar cálculo reactivo en tiempo real de la cuadratura ($\text{Monto Total} - \sum \text{Líneas}$) con badges visuales verde/rojo.
  - Integrar guardado y persistencia en `Storage.saveTransactions()` y `Storage.saveAccounts()`.

- [x] **T4: Visualización en historial de movimientos y reportes**
  - Mostrar badge "Split (N partidas)" en la tabla de transacciones recientes.
  - Permitir ver el desglose de conceptos y cuentas afectadas de cada split.

- [x] **T5: Verificación en navegador y cierre de especificación**
  - Validar flujo en vivo en el navegador mediante Chrome DevTools MCP.
  - Probar el caso de ejemplo: pago con tarjeta de crédito de $1.000.000 con $80.000 a "Activos del Hogar" y $920.000 a "Electrónica y Computación".
  - Marcar `specs/004-movimientos-split/spec.md` como `Estado: implementada`.
  - Actualizar `memory.md` con el registro de la Spec 004.
