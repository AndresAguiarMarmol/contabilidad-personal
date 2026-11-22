# Especificación Funcional — Spec 025: CRUD Completo de Movimientos en el Libro de Movimientos

**Estado:** Aprobada  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Propósito y Contexto de Negocio
Actualmente, la sección "Libro de Movimientos" (`#view-transactions`) permite listar, filtrar por fecha/tipo/cuenta/categoría, buscar y exportar transacciones a formato CSV, así como registrar nuevas transacciones mediante el botón "+ Nuevo Movimiento". Sin embargo, los usuarios no cuentan con acciones directas para **editar** o **eliminar** transacciones registradas previamente directamente desde la tabla del historial.

Se requiere completar el ciclo **CRUD** (Crear, Leer, Actualizar y Eliminar) en el "Libro de Movimientos", habilitando la edición completa de movimientos existentes y la eliminación segura con recálculo contable automático de los saldos de las cuentas bancarias/billeteras y salvaguarda mediante lápidas de eliminación (`deletedTransactions`) para prevenir la reaparición de movimientos eliminados tras sincronizaciones en la nube.

---

## 2. Historias de Usuario

- **HU-1 (Edición de Movimientos):** Como usuario, quiero poder editar cualquier movimiento registrado previamente (monto, fecha, concepto, categoría, cuentas origen/destino o partidas split) para corregir errores de tipeo o cambios en mis gastos sin tener que borrar y reescribir todo.
- **HU-2 (Eliminación de Movimientos):** Como usuario, quiero poder eliminar un movimiento registrado por error desde el Libro de Movimientos con confirmación previa y que el saldo de la cuenta afectada se recalcule de manera automática e inmediata.
- **HU-3 (Consistencia y Cuadratura Contable):** Como usuario, quiero que tras editar o eliminar un movimiento, todos los saldos contables de mis cuentas bancarias, tarjetas y presupuestos del mes se mantengan 100% cuadrados y actualizados sin descuadres.
- **HU-4 (Prevención de Resurrección en la Nube):** Como usuario que sincroniza con Cloud Firestore, quiero que los movimientos eliminados no vuelvan a aparecer al sincronizar con otros dispositivos o al reanudar la app.

---

## 3. Requisitos Funcionales (Sintaxis EARS)

### RF-1: Columna de Acciones en el Libro de Movimientos (Ubicuo)
El sistema debe mostrar una columna "Acciones" en la tabla del Libro de Movimientos (`#view-transactions`) que contenga, para cada fila, un botón accesible de "Editar" (icono de lápiz) y un botón de "Eliminar" (icono de papelera).

### RF-2: Función Pura `recalcularBalancesCuentas(cuentas, transacciones)` (Ubicuo)
El sistema debe implementar una función pura en `assets/js/financeCalculations.js` que, dado un conjunto de cuentas con su `initialBalance` y el conjunto de transacciones vigentes, recalcule deterministamente el `currentBalance` de cada cuenta considerando:
- Gastos: descuentan del saldo de la cuenta origen.
- Ingresos: suman al saldo de la cuenta destino.
- Transferencias: descuentan de la cuenta origen y suman a la cuenta destino (respetando `toAmount` multidivisa o `amount`).
- Movimientos divididos (Split): descuentan el monto total de la cuenta origen y acreditan a cuentas de destino si las partidas apuntan a cuentas financieras (`targetAccountId`).

### RF-3: Modal de Edición de Movimientos (Event-driven)
Cuando el usuario presiona el botón "Editar" en una fila del Libro de Movimientos, el sistema debe abrir el modal de transacciones precargando todos los campos existentes (tipo, fecha, concepto, monto, categoría, cuentas origen/destino, tasa de cambio y partidas split) bajo el título "Editar Movimiento" y botón "Actualizar Movimiento".

### RF-4: Aplicación y Persistencia de Ediciones (Event-driven)
Cuando el usuario confirma la edición de un movimiento, el sistema debe:
1. Validar los datos actualizados mediante las funciones de validación contable existentes.
2. Reemplazar la transacción en `state.transactions` conservando su `id`.
3. Recalcular los saldos de todas las cuentas con `recalcularBalancesCuentas`.
4. Sincronizar presupuestos mensuales con `sincronizarPresupuestosConTransacciones`.
5. Persistir los cambios en `Storage` y disparar auto-sincronización con Firestore.

### RF-5: Eliminación de Movimientos con Lápidas (Event-driven)
Cuando el usuario presiona el botón "Eliminar" en una fila del Libro de Movimientos, el sistema debe solicitar confirmación explícita con el concepto y monto. Tras confirmar:
1. Registrar el `id` en el array de lápidas `deletedTransactions`.
2. Remover la transacción de `state.transactions`.
3. Recalcular inmediatamente los saldos de las cuentas con `recalcularBalancesCuentas`.
4. Sincronizar presupuestos con `sincronizarPresupuestosConTransacciones`.
5. Persistir en `Storage` y auto-sincronizar con Firestore.

### RF-6: Fusión Multi-Dispositivo con Lápidas de Transacciones (Ubicuo)
La función pura `Calculations.fusionarEstadoContable(localState, remoteState)` debe incorporar `deletedTransactions`, unificando las listas de lápidas y descartando activamente cualquier transacción eliminada tanto de la copia local como remota, evitando su resurrección.

---

## 4. Requisitos No Funcionales y Restricciones

- **RNF-1 (Inmutabilidad y Testabilidad):** `recalcularBalancesCuentas` debe ser una función pura, inmutable y verificada al 100% mediante `node --test`.
- **RNF-2 (Cero Regresiones):** No romper ninguna de las 119 pruebas unitarias previas del proyecto.
- **RNF-3 (Usabilidad Móvil y Accesibilidad):** Los botones de acción deben tener dimensiones táctiles adecuadas ($\ge 32\text{px}$), etiquetas `title` descriptivas e iconos SVG claros.
