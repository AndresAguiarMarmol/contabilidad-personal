# Tareas — Spec 002 (Planilla de Nuevos Movimientos)

- [x] **T1. Lógica pura de validación e impacto de transacciones en cuentas (TDD).** RF-4, RF-5, RF-6, RF-7
  - Hecho cuando: La suite `tests/transactions.test.js` se ejecute con `node --test` y pase al 100% en verde verificando validaciones y cálculos atómicos de saldo.
- [x] **T2. Construcción e inyección interactiva de la planilla modal de nuevo movimiento.** RF-1, RF-2, RF-3
  - Hecho cuando: Al pulsar "+ Nuevo Movimiento" se abra el modal con el selector reactivo de tipos (Gasto, Ingreso, Transferencia), cuentas origen/destino y categorías correspondientes.
- [x] **T3. Conexión del formulario con persistencia, actualización reactiva y toasts.** RF-5, RF-6, RF-7
  - Hecho cuando: Al guardar un movimiento válido se persistan los cambios en `localStorage`, se actualicen los saldos en el Dashboard, se añada a la tabla de movimientos y se notifique con un Toast.
- [x] **T4. Validación integral de la planilla y sincronización de memoria.** RF-1 a RF-7
  - Hecho cuando: Se verifique en vivo mediante Chrome DevTools el registro exitoso de un movimiento, la suite completa pase en verde y `memory.md` quede actualizado.
