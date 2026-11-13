# Plan Técnico — Spec 012: Enlace de Categorías con el Plan de Cuentas Contable

## 1. Diseño de Arquitectura
Actualmente, las categorías son arrays estáticos en `app.js` (`EXPENSE_CATEGORIES` e `INCOME_CATEGORIES`).
Con este cambio:
- La fuente de verdad para las categorías pasa a ser `obtenerCatalogoPlanCuentas(state.planAccounts, state.accounts, state.transactions)`.
- Se introducen funciones puras en `financeCalculations.js` para extraer y resolver categorías:
  - `obtenerCategoriasDesdePlan(catalogo, tipo)`:
    - `"expense"` -> Extrae cuentas de `classNumber === 5`. Retorna `[{ code, name, groupName, label: "${code} · ${name}" }, ...]`.
    - `"income"` -> Extrae cuentas de `classNumber === 4`. Retorna `[{ code, name, groupName, label: "${code} · ${name}" }, ...]`.
    - `"split"` -> Extrae cuentas de `classNumber === 5` más cuentas de bienes personales (`classNumber === 1` cuyo código comience con `1.3`).
    - `"all"` -> Todas las cuentas de resultado (Clases 4 y 5).
  - `resolverCategoriaPlan(valor, catalogo)`: Resuelve si el usuario guardó un código o un nombre, retornando el objeto `{ code, name }`.

## 2. Modificaciones en `app.js`
1. Reemplazar el uso estático de `EXPENSE_CATEGORIES` e `INCOME_CATEGORIES` por llamadas reactivas a `Calculations.obtenerCategoriasDesdePlan(fullCatalog, "expense" | "income" | "split")`.
2. En `openTransactionModal`:
   - El selector `#tx-input-category` se llena dinámicamente con las cuentas correspondientes según si el tipo seleccionado es Gasto o Ingreso.
   - En partidas Split, el selector dinámico agrupa cuentas bancarias receptoras y cuentas del Plan de Cuentas (Gastos + Activos Fijos).
   - Al guardar la transacción, se persiste `category: cuenta.name` y `categoryCode: cuenta.code`.
3. En `renderTransactions()` y `renderAccountDetailView()`:
   - El selector `#tx-category-filter` se genera a partir de `obtenerCategoriasDesdePlan(fullCatalog, "all")`.
   - La tabla de movimientos renderiza una etiqueta elegante con el código contable de la cuenta (`<span class="text-[10px] font-mono text-slate-400 mr-1">${categoryCode}</span>`).
4. En `openBudgetModal()`:
   - Las categorías presupuestarias provienen de `obtenerCategoriasDesdePlan(fullCatalog, "expense")`.

## 3. Plan de Pruebas TDD
- Archivo de pruebas: `tests/category-plan-link.test.js`.
- Casos de prueba:
  1. `obtenerCategoriasDesdePlan` con tipo "expense" retorna todas las cuentas de clase 5 con código y etiqueta.
  2. `obtenerCategoriasDesdePlan` con tipo "income" retorna todas las cuentas de clase 4.
  3. `obtenerCategoriasDesdePlan` con tipo "split" incluye cuentas de gasto y activos fijos (1.3).
  4. `resolverCategoriaPlan` encuentra la cuenta por código exacto o por nombre.
  5. Inclusión automática de cuentas personalizadas añadidas por el usuario al Plan de Cuentas.
