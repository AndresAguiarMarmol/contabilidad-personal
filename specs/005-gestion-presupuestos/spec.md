# Spec 005 — Gestión de Presupuestos Mensuales por Categoría

Estado: implementada

## 1. Contexto y Objetivo
En la contabilidad y finanzas personales, los presupuestos mensuales son la herramienta primordial para controlar el sobregasto y asegurar la tasa de ahorro. Actualmente, la aplicación cuenta con una visualización de presupuestos de demostración, pero al presionar el botón "Nuevo Presupuesto" (`btn-modal-new-budget`), se muestra un mensaje de marcador de posición temporal.

El objetivo de esta especificación es implementar la gestión completa e interactiva de Presupuestos Mensuales por Categoría:
- Planilla interactiva para crear y ajustar presupuestos mensuales.
- Validación de datos (monto límite mayor a cero, selección de categoría y período mensual).
- Cálculo dinámico del gasto acumulado del mes a partir de las transacciones registradas (incluyendo gastos de transacciones Split).
- Semáforos visuales de alerta (óptimo $\le 75\%$, advertencia $> 75\%$ y $\le 100\%$, y sobregiro $> 100\%$) con cálculo del saldo restante disponible o excedente.
- Capacidad de modificar límites o eliminar presupuestos existentes.

---

## 2. Usuarios y Historias de Usuario
- **HU-1:** Como usuario, quiero definir un límite de gasto mensual para una categoría (ej. Alimentación, Vivienda, Ocio) para controlar mis egresos del mes.
- **HU-2:** Como usuario, quiero ver en tiempo real cuánto he consumido de mi presupuesto, cuánto me queda disponible y recibir una alerta visual si supero el 75% o si me sobregiro.
- **HU-3:** Como usuario, quiero poder editar el monto límite de un presupuesto existente o eliminarlo si ya no deseo monitorear esa categoría.

---

## 3. Requisitos Funcionales (EARS)
- **RF-1 (Evento):** CUANDO el usuario hace clic en "Nuevo Presupuesto" o en el botón de edición de un presupuesto existente, EL SISTEMA abre la planilla modal con los campos de Categoría, Mes ("YYYY-MM") y Monto Límite ($).
- **RF-2 (Estado no deseado):** SI el usuario intenta guardar un presupuesto con monto menor o igual a cero o sin seleccionar una categoría válida, ENTONCES EL SISTEMA bloquea el guardado y notifica el error correspondiente.
- **RF-3 (Comportamiento continuo):** EL SISTEMA calcula dinámicamente el gasto acumulado (`spentAmount`) para cada presupuesto sumando todos los egresos del mes correspondiente pertenecientes a esa categoría (incluyendo partidas de compras split).
- **RF-4 (Evento):** CUANDO el usuario confirma un presupuesto válido, EL SISTEMA lo almacena de forma inmutable en el estado local y en `Storage`, actualizando la vista de presupuestos y el Dashboard inmediatamente.
- **RF-5 (Comportamiento continuo):** EL SISTEMA muestra en cada tarjeta de presupuesto:
  - Barra de progreso porcentual.
  - Semáforo de alerta: verde (óptimo $\le 75\%$), amarillo (advertencia $76\% - 100\%$), rojo (sobregiro $> 100\%$).
  - Monto gastado vs Monto límite vs Saldo disponible restante (o monto excedido en rojo).
  - Botones de acción para editar el límite o eliminar el presupuesto.
- **RF-6 (Evento):** CUANDO el usuario elimina un presupuesto, EL SISTEMA lo retira del listado y de la persistencia sin afectar las transacciones históricas registradas.

---

## 4. Requisitos No Funcionales
- **RNF-1:** Persistencia completa en `localStorage` bajo la clave `finance_budgets_data`.
- **RNF-2:** Lógica desacoplada y probada al 100% con `node --test`.
- **RNF-3:** Compatibilidad universal para ejecutarse sin servidor (`file:///`) y en HTTP sin errores de consola.

---

## 5. Casos Límite y Manejo de Errores
- Si ya existe un presupuesto para la misma categoría en el mismo mes, el sistema debe actualizar el límite existente en lugar de crear un registro duplicado.
- Si el gasto acumulado es $0, el porcentaje debe ser $0\%$ (sin errores de división por cero).
- Si el gasto acumulado supera el límite, la barra de progreso se satura al 100% visualmente pero muestra el porcentaje real (ej. $124\%$) y el indicador de sobregiro.

---

## 6. Criterios de Finalización (DoD)
- [x] Planilla modal funcional al pulsar "Nuevo Presupuesto" (`btn-modal-new-budget`).
- [x] Selector de categorías de gasto y selector de período mensual.
- [x] Validación de monto positivo y unicidad por categoría/mes.
- [x] Funciones puras de cálculo (`validarPresupuesto`, `calcularGastoCategoriaMes`, `sincronizarPresupuestosConTransacciones`) cubiertas con pruebas unitarias en `node --test`.
- [x] Tarjetas de presupuesto con semáforo, porcentaje, saldo disponible y botones de editar/eliminar.
- [x] Eliminación y edición funcional con actualización reactiva en `Storage` y en el Dashboard.
- [x] Verificación en vivo en navegador con Chrome DevTools con 0 errores de consola.
