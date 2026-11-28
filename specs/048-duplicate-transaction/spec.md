# Spec 048: Opción de Duplicar Movimiento en Modal de Edición

## 1. Visión General y Propósito
Permitir a los usuarios clonar y reutilizar rápidamente cualquier movimiento existente (gasto, ingreso, transferencia o movimiento dividido/split) desde la propia ventana modal de "Editar Movimiento", transformando el formulario en un registro nuevo, editable en su totalidad, con fecha de hoy por defecto, comprobante limpio para nueva asignación y descripción idéntica, evitando la reescritura manual de transacciones recurrentes o análogas sin alterar el movimiento original.

---

## 2. Decisiones de Diseño y Requisitos de Usuario
- **Fecha por Defecto (Decisión 1.a):** Al duplicar, el campo de fecha se inicializa con la fecha actual del día (ISO `YYYY-MM-DD`), permaneciendo 100% editable por el usuario.
- **Comprobante Adjunto (Decisión 2.b):** El comprobante PDF / foto adjunta se inicializa vacío (`invoicePdf: null`, `invoiceName: null`), ocultando el contenedor de vista previa, para evitar asociar facturas anteriores a un nuevo gasto duplicado y permitiendo adjuntar un comprobante nuevo si se desea.
- **Descripción / Concepto (Decisión 3.a):** Se mantiene exactamente la descripción del movimiento original, permitiendo edición inmediata en el campo.
- **Desvinculación Estricta de ID:** El movimiento duplicado carece de ID previo en el formulario (`txToEdit = null`), asegurando que al pulsar "Guardar Movimiento" se cree una nueva entidad con ID único (`TX-...`), sin riesgo de sobrescribir el registro original.

---

## 3. Requisitos Funcionales en Sintaxis Formal EARS

### RF-1: Función Pura de Clonación (`clonarMovimiento`)
- **[Ubiquitous]** El sistema dispondrá de una función pura `Calculations.clonarMovimiento(txOriginal, opciones = {})` en `financeCalculations.js`.
- **[Event-driven]** Cuando se invoque `clonarMovimiento(txOriginal)`:
  - Generará una copia profunda del movimiento desvinculando el ID original.
  - Asignará por defecto la fecha actual del día en formato ISO (`YYYY-MM-DD` o ISO string) salvo que se especifique otra en `opciones.date`.
  - Limpiará `invoicePdf` e `invoiceName` (`null`) salvo que se especifique `opciones.keepInvoice = true`.
  - Mantendrá el mismo monto, tipo, cuenta origen, cuenta destino, categoría, código de categoría, proveedor, medio de pago y descripción.
  - Si el movimiento es dividido (`isSplit: true`), clonará las partidas (`splitLines`) con nuevos identificadores únicos de línea.

### RF-2: Botón de Duplicación en Formulario Modal
- **[State-driven]** Mientras el modal de movimientos se encuentre en modo de edición (`txToEdit !== null`), el formulario incluirá un botón visible `#btn-duplicate-tx` con etiqueta o texto "Duplicar" e icono representativo.
- **[State-driven]** Mientras el modal se encuentre en modo de creación nuevo (`txToEdit === null`), el botón `#btn-duplicate-tx` no se mostrará o estará ausente del pie de formulario.

### RF-3: Transición Reactiva a Modo Nuevo Registro Duplicado
- **[Event-driven]** Al hacer clic en `#btn-duplicate-tx`:
  - El sistema cambiará el título del modal a `"Registrar Nuevo Movimiento (Copia)"`.
  - El sistema ocultará o removerá el botón `#btn-duplicate-tx`.
  - El sistema cambiará el texto del botón de envío principal de `"Actualizar Movimiento"` a `"Guardar Movimiento"`.
  - El sistema establecerá el campo de fecha con la fecha del día en curso.
  - El sistema limpiará cualquier comprobante PDF previo (`currentInvoicePdf = null`, `currentInvoiceName = null`) y ocultará `#tx-invoice-preview-container`.
  - El sistema desvinculará `txToEdit` a `null`, garantizando que el evento `submit` inserte una nueva transacción.
  - El sistema emitirá una notificación Toast informativa para guiar al usuario.
  - Todos los campos del formulario permanecerán interactivos y editables hasta que el usuario decida guardar o cancelar.

### RF-4: Persistencia y Recálculo Contable sin Afectar Original
- **[Event-driven]** Al enviar el formulario tras haber pulsado duplicar:
  - El sistema registrará la nueva transacción con un nuevo ID único (`TX-...`).
  - La transacción original permanecerá inmutable con su ID, fecha y atributos intactos.
  - El sistema recalculará los balances de las cuentas afectadas (`recalcularBalancesCuentas`) y actualizará presupuestos (`sincronizarPresupuestosConTransacciones`).
  - El sistema persistirá los cambios en `Storage` y activará la auto-sincronización con la base de datos en la nube.
