# Spec 010 — Plan de Cuentas (CRUD) en Menú Vertical

Estado: implementada

## 1. Contexto y Objetivo
En la aplicación de contabilidad personal, el usuario gestiona cuentas de bancos, efectivo, billeteras y tarjetas. Actualmente, la creación de cuentas se encuentra en la vista de tarjetas de "Cuentas & Billeteras", pero no existe una vista formal del **Plan de Cuentas Contable** que permita administrar de forma integral y estructurada el catálogo maestro de cuentas con operaciones completas de **CRUD** (Crear, Consultar/Leer, Modificar/Actualizar y Eliminar).

El objetivo es:
1. Incorporar en el menú vertical de navegación, inmediatamente **debajo de Cuentas & Billeteras**, un botón de acceso directo a la vista **"Plan de Cuentas"** con indicador `CRUD`.
2. Implementar la pantalla dedicada `view-chart-of-accounts` que muestre el Plan de Cuentas estructurado por grupos contables (Activos: disponible e inversiones; Pasivos: tarjetas de crédito y deudas), con métricas consolidadas por grupo.
3. Proveer soporte CRUD completo:
   - **Crear (Create):** Alta de cuenta con código sugerido, nombre, grupo contable/tipo, color, icono, moneda y saldo inicial.
   - **Leer/Listar (Read):** Vista tabular o jerárquica con buscador, filtro por grupo contable y visualización de saldos y transacciones asociadas.
   - **Actualizar (Update):** Modal interactivo para editar nombre, color, icono, exclusión de patrimonio o código.
   - **Eliminar (Delete):** Validación de integridad referencial. Si la cuenta tiene movimientos, el sistema advierte el impacto antes de confirmar o impide el borrado accidental.

---

## 2. Usuarios e Historias de Usuario
- **HU-1:** Como usuario, quiero ver en el menú vertical de la aplicación un botón "Plan de Cuentas" ubicado justo debajo de "Cuentas & Billeteras" para acceder directamente al catálogo contable.
- **HU-2:** Como usuario, quiero ver mis cuentas ordenadas por su naturaleza contable (1. Activos y 2. Pasivos) con subtotales claros de cada rubro y el patrimonio neto resultante.
- **HU-3:** Como usuario, quiero crear nuevas cuentas desde el Plan de Cuentas indicando su clasificación y atributos contables.
- **HU-4:** Como usuario, quiero editar los datos de cualquier cuenta existente (nombre, color, icono o clasificación) para mantener mi plan contable actualizado.
- **HU-5:** Como usuario, quiero poder eliminar cuentas que ya no utilice, contando con una validación de seguridad que me informe si existen movimientos registrados en ella.
- **HU-6:** Como usuario, quiero buscar rápidamente cuentas por nombre o código dentro del Plan de Cuentas.

---

## 3. Requisitos Funcionales (EARS)

- **RF-1 (Interacción / Navegación):** EL SISTEMA incluye en la barra de navegación vertical (`#sidebar`), inmediatamente después del botón de "Cuentas & Billeteras", un botón con etiqueta "Plan de Cuentas", icono de árbol/catálogo contable e indicador `CRUD`, que al pulsarlo activa la vista `view-chart-of-accounts`.
- **RF-2 (Comportamiento continuo):** MIENTRAS la vista "Plan de Cuentas" esté activa, EL SISTEMA presenta:
  1. Cabecera con título "Plan de Cuentas", subtítulo descriptivo y botón "+ Nueva Cuenta Contable".
  2. Resumen financiero superior con: Total Activos (1), Total Pasivos (2) y Patrimonio Neto consolidado.
  3. Barra de herramientas con buscador en vivo por nombre o código y selector de filtrado por grupo (Todos, Activos, Pasivos).
  4. Agrupación contable jerárquica:
     - **Grupo 1: Activos** (Caja/Efectivo, Bancos, Billeteras Digitales, Inversiones/Ahorro).
     - **Grupo 2: Pasivos** (Tarjetas de Crédito, Deudas/Préstamos).
- **RF-3 (Comportamiento de datos / Read):** EL SISTEMA lista para cada cuenta su código contable (generado o asignado), icono, nombre, tipo, saldo contable actual formateado en moneda y número de movimientos asociados.
- **RF-4 (Evento / Create):** CUANDO el usuario pulsa "+ Nueva Cuenta Contable", EL SISTEMA despliega el formulario modal de alta validando que el nombre no esté duplicado mediante `validarNuevaCuenta()`.
- **RF-5 (Evento / Update):** CUANDO el usuario pulsa el botón "Editar" en una cuenta, EL SISTEMA abre el formulario modal precargado con los datos de dicha cuenta, permitiendo modificar su nombre, tipo, color, icono y opción de exclusión, validando la integridad mediante `validarEdicionCuenta()`.
- **RF-6 (Evento / Delete):** CUANDO el usuario pulsa el botón "Eliminar" en una cuenta:
  - SI la cuenta posee movimientos asociados, EL SISTEMA advierte explícitamente la cantidad de transacciones vinculadas y requiere confirmación previa de seguridad.
  - TRAS la confirmación, EL SISTEMA elimina la cuenta de `state.accounts`, actualiza `localStorage`, recalcula los saldos y refresca la vista del Plan de Cuentas y Dashboard.
- **RF-7 (Lógica desacoplada):** EL SISTEMA implementa la clasificación contable, validación de edición y evaluación de borrado mediante funciones puras desacopladas en `financeCalculations.js` probadas al 100% con `node --test`.

---

## 4. Requisitos No Funcionales
- **RNF-1:** Compatibilidad universal sin bundler, funcionando tanto en `file:///` como en HTTP.
- **RNF-2:** Persistencia íntegra en `localStorage` sincronizada automáticamente con la clave `finance_accounts_data`.
- **RNF-3:** Accesibilidad, teclado accesible y modo oscuro coherente con el sistema de diseño.

---

## 5. Casos Límite y Manejo de Errores
- Intento de editar con nombre vacío o duplicado con otra cuenta: El modal muestra el mensaje de error y no persiste el cambio.
- Intento de eliminar una cuenta con saldo adeudado o fondos activos: El sistema solicita confirmación con alerta detallando el saldo y movimientos.
- Búsqueda sin coincidencias en el Plan de Cuentas: Se muestra un mensaje amigable invitando a limpiar el filtro o crear una cuenta nueva.

---

## 6. Criterios de Finalización (DoD)
- [x] Botón "Plan de Cuentas" agregado al menú vertical debajo de "Cuentas & Billeteras".
- [x] Función pura `clasificarPlanDeCuentas(accounts)` testeada en `node --test`.
- [x] Función pura `validarEdicionCuenta(datos, cuentasExistentes, cuentaId)` testeada en `node --test`.
- [x] Función pura `puedeEliminarCuenta(cuentaId, transactions)` testeada en `node --test`.
- [x] Vista `view-chart-of-accounts` creada en `index.html` e integrada en `switchView()`.
- [x] Operaciones completas CRUD: Crear, Listar con grupos contables, Editar cuenta existente y Eliminar cuenta.
- [x] Sincronización automática con la cuadrícula de cuentas y el Dashboard.
- [x] 100% de pruebas unitarias en verde.
- [x] Verificación en vivo en navegador con 0 errores de consola.
