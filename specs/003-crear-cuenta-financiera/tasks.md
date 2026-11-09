# Tareas — Spec 003 (Creación de Nuevas Cuentas Financieras)

- [x] **T1. Lógica pura de validación de cuentas y fábrica de objetos (TDD).** RF-2, RF-3, RF-4
  - Hecho cuando: La suite `tests/accounts.test.js` se ejecute con `node --test` y pase al 100% en verde verificando validación de nombres, unicidad, tipos válidos y saldo negativo en tarjetas de crédito.
- [x] **T2. Construcción e inyección interactiva de la planilla modal de nueva cuenta.** RF-1, RF-3
  - Hecho cuando: Al pulsar "+ Nueva Cuenta" se abra el modal con todos los campos (Nombre, Tipo con iconos, Saldo inicial, Moneda, Color y Exclusión).
- [x] **T3. Conexión del formulario con persistencia, cuadrícula de cuentas y Dashboard.** RF-4, RF-5
  - Hecho cuando: Al guardar una cuenta válida se persista en `localStorage`, aparezca en la cuadrícula de Cuentas, actualice el Patrimonio Neto y esté disponible en el formulario de Nuevos Movimientos.
- [x] **T4. Validación integral de la planilla y sincronización de memoria.** RF-1 a RF-5
  - Hecho cuando: Se verifique en vivo mediante Chrome DevTools la creación exitosa de una cuenta, la suite completa pase en verde y `memory.md` quede actualizado.
