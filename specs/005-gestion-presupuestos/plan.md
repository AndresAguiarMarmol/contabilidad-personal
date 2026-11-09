# Plan Técnico — Spec 005 (Gestión de Presupuestos Mensuales por Categoría)

## 1. Archivos Involucrados y Responsabilidades
- `assets/js/financeCalculations.js`: Lógica pura de validación y cálculo:
  - `validarPresupuesto(datos)`: Valida campos requeridos (categoría no vacía, límite numérico > 0, formato de mes "YYYY-MM").
  - `calcularGastoCategoriaMes(transactions, category, month)`: Calcula la suma de gastos de una categoría en un mes dado (considerando gastos estándar y partidas split de compras).
  - `sincronizarPresupuestosConTransacciones(budgets, transactions)`: Recalcula inmutablemente el `spentAmount` de cada presupuesto según las transacciones registradas.
- `tests/budgets.test.js`: Suite de pruebas unitarias automatizadas con `node --test` para validar la lógica pura.
- `assets/js/app.js`: Interfaz de usuario y flujo:
  - Implementación de `openBudgetModal(budgetIdToEdit)` inyectando el formulario en `<dialog id="app-modal">`.
  - Conexión del botón `btn-modal-new-budget` con `openBudgetModal()`.
  - Renderizado mejorado de las tarjetas en `renderBudgets()` con semáforo, saldo restante/sobregiro y botones de editar y eliminar.
  - Gestión de eventos de guardado, edición y eliminación con persistencia en `Storage.saveBudgets()`.

---

## 2. Modelos de Datos
```javascript
{
  id: "BUD-1731150000000",
  category: "Alimentación & Supermercado",
  limitAmount: 250000,
  spentAmount: 145000,
  month: "2026-11"
}
```

---

## 3. Algoritmo de Cálculo de Gasto Acumulado (`calcularGastoCategoriaMes`)
1. Normalizar `month` (ej. "2026-11").
2. Recorrer `transactions`:
   - Filtrar transacciones de tipo `"expense"` cuya fecha comience con `month`.
   - Si `tx.isSplit` y contiene `tx.splitLines`:
     - Sumar el monto de aquellas líneas cuyo `category === category` y no tengan `targetAccountId` (no transferencias a activos).
   - Si no es split:
     - Si `tx.category === category`: sumar `tx.amount`.
3. Retornar el total acumulado.

---

## 4. Algoritmo de la Planilla (`openBudgetModal`)
1. Abrir modal con título "Nuevo Presupuesto Mensual" o "Editar Presupuesto".
2. Precargar campos:
   - Categoría: selector con las categorías de gasto disponibles (`EXPENSE_CATEGORIES`).
   - Límite mensual: input numérico con valor existente o sugerido.
   - Período / Mes: input tipo `month` (ej. "2026-11").
3. Al enviar:
   - Ejecutar `validarPresupuesto()`.
   - Si es inválido: mostrar error vía Toast y mantener modal abierto.
   - Si es válido:
     - Calcular `spentAmount` automáticamente llamando a `calcularGastoCategoriaMes()`.
     - Si se está editando o si ya existe un presupuesto para esa categoría y mes: actualizar `limitAmount` y `spentAmount`.
     - Si es nuevo: agregarlo a `state.budgets`.
     - Persistir con `Storage.saveBudgets(state.budgets)`.
     - Cerrar modal, refrescar la vista con `renderActiveView()` y notificar con Toast de éxito.

---

## 5. Estrategia de Pruebas (TDD Red-Green)
- `tests/budgets.test.js`:
  1. Rechaza datos nulos o vacíos.
  2. Rechaza límite menor o igual a cero.
  3. Rechaza categoría ausente o inválida.
  4. Aprueba presupuesto con datos válidos.
  5. `calcularGastoCategoriaMes` suma correctamente gastos estándar del mes.
  6. `calcularGastoCategoriaMes` incluye partidas split correspondientes a la categoría y descarta transferencias de activos.
  7. `sincronizarPresupuestosConTransacciones` actualiza de forma inmutable el campo `spentAmount` en toda la lista de presupuestos.
