# Spec 049: Menú Contextual con CRUD y Duplicación de Movimientos en Cuentas y Billeteras

## 1. Visión General y Propósito
Dotar a la aplicación de un menú contextual reactivo e interactivo accesible mediante clic derecho (desktop), pulsación prolongada (touch/mobile) o botón dedicado de opciones (`...`) en las filas de transacciones tanto en el Detalle de Cuenta ("Cuentas y Billeteras") como en el Libro de Movimientos general. Este menú proporciona acceso inmediato y centralizado a todas las operaciones del ciclo CRUD contable y a la acción rápida de "Duplicar Registro".

---

## 2. Decisiones de Diseño y Requisitos de Usuario
- **Interacción Multi-Dispositivo (Decisión 1.a):** Soporte simultáneo para:
  1. Clic derecho en ratón (`contextmenu`).
  2. Pulsación prolongada (*long press* $\ge 500\text{ms}$) en pantallas táctiles.
  3. Botón de tres puntos (`...`) en la columna de acciones para dispositivos móviles.
- **Alcance Homogéneo (Decisión 2.a):** Disponible tanto en la pantalla de **Detalle de Cuenta** (`#view-account-detail`) como en el libro global de **Movimientos** (`#view-transactions`).
- **Inclusión de "Nuevo Movimiento" en el Menú (Decisión 3.Si):** El menú contextual incorpora la acción *"➕ Nuevo Movimiento"* (pre-seleccionando la cuenta activa si se invoca desde el detalle de cuenta) para completar el ciclo CRUD integral.

---

## 3. Requisitos Funcionales en Sintaxis Formal EARS

### RF-1: Estructura DOM del Menú Contextual
- **[Ubiquitous]** El archivo `index.html` contendrá un elemento `<div id="tx-context-menu">` con posición fija (`fixed`), inicialmente oculto (`hidden`), con capa flotante superior (`z-50`) y las siguientes opciones accesibles:
  - `#ctx-tx-edit`: Opción para "Editar Movimiento" (icono `pencil`).
  - `#ctx-tx-duplicate`: Opción para "Duplicar Registro" (icono `copy`).
  - `#ctx-tx-view-pdf`: Opción para "Ver Factura / Boleta PDF" (icono `file-text`), habilitada solo si la transacción posee comprobante.
  - `#ctx-tx-delete`: Opción para "Eliminar Movimiento" (icono `trash-2`, estilo de advertencia/peligro).
  - `#ctx-tx-new`: Opción para "Nuevo Movimiento" (icono `plus-circle`).

### RF-2: Detección y Posicionamiento Adaptativo
- **[Event-driven]** Cuando el usuario haga clic derecho (`contextmenu`), mantenga pulsada una fila (*touch long-press*) o pulse el botón de acciones (`...`) sobre un movimiento:
  - El sistema prevendrá el menú nativo del navegador (`e.preventDefault()`).
  - El sistema calculará las coordenadas óptimas `(X, Y)` asegurando que el menú no se desborde del viewport (pantalla visible).
  - El sistema asociará el ID de la transacción y mostrará `#tx-context-menu`.

### RF-3: Despacho de Acciones CRUD y Duplicación
- **[Event-driven]** Al seleccionar una opción del menú contextual:
  - **Editar:** Invocará `openTransactionModal(tx.type, tx)` cargando el movimiento en modo edición.
  - **Duplicar:** Invocará la apertura de la planilla en modo duplicado (con fecha de hoy, comprobante limpio y desvinculada para inserción nueva, aplicando la lógica pura de la Spec 048).
  - **Ver PDF:** Si la transacción tiene `invoicePdf`, invocará `abrirComprobantePdf` abriendo el visor modal in-app (Spec 047).
  - **Eliminar:** Invocará `solicitarEliminarTransaccion(tx.id)` solicitando confirmación y recalculando balances contables.
  - **Nuevo:** Invocará `openTransactionModal("expense")` con la cuenta de origen predeterminada.
  - El menú se cerrará inmediatamente tras despachar cualquier acción.

### RF-4: Cierre Automático y Accesibilidad
- **[State-driven]** Mientras el menú contextual esté visible:
  - Cualquier clic fuera de él (`document.click`) o pulsación de la tecla `Escape` lo cerrará inmediatamente.
  - El scroll de la página cerrará el menú para evitar posiciones flotantes desalineadas.
