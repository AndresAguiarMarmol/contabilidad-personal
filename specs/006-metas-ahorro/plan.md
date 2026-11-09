# Plan Técnico — Spec 006 (Gestión de Metas de Ahorro Personal)

## 1. Archivos Involucrados y Responsabilidades
- `assets/js/financeCalculations.js`: Lógica pura de validación y cálculo:
  - `validarMetaAhorro(datos)`: Valida título no vacío y `targetAmount` numérico mayor a cero.
  - `calcularProgresoMeta(currentAmount, targetAmount)`: Retorna `{ percentage, remainingAmount, isCompleted }`.
  - `aplicarAporteMeta(goal, contributionAmount)`: Retorna una nueva meta con el `currentAmount` incrementado de forma inmutable.
- `tests/goals.test.js`: Suite de pruebas unitarias automatizadas con `node --test` para verificar los requisitos de Spec 006.
- `assets/js/app.js`: Interfaz de usuario:
  - `openGoalModal(goalIdToEdit)`: Planilla modal para crear o editar una meta.
  - `openContributeGoalModal(goalId)`: Modal ligero para ingresar aportes monetarios a una meta.
  - Conectar el botón `btn-modal-new-goal` con `openGoalModal()`.
  - Mejorar el renderizado de `renderBudgets()` para las tarjetas de metas (`goals-grid`) con barra de progreso estilizada con el color de la meta, monto restante/cumplido, y botones interactivos "+ Aportar", "Editar" y "Eliminar".

---

## 2. Modelo de Datos
```javascript
{
  id: "GOAL-1731150000000",
  title: "Pie para Departamento",
  targetAmount: 5000000,
  currentAmount: 1250000,
  deadlineDate: "2027-12-31",
  color: "#2563eb"
}
```

---

## 3. Algoritmo de Cálculo de Progreso (`calcularProgresoMeta`)
1. Normalizar `targetAmount = Number(targetAmount) || 1`.
2. Normalizar `currentAmount = Number(currentAmount) || 0`.
3. Calcular `percentage = Math.round((currentAmount / targetAmount) * 100)`.
4. Calcular `remainingAmount = Math.max(0, targetAmount - currentAmount)`.
5. Determinar `isCompleted = currentAmount >= targetAmount`.
6. Retornar `{ percentage, remainingAmount, isCompleted }`.

---

## 4. Algoritmo de la Planilla y Aportes
1. **Creación / Edición (`openGoalModal`):**
   - Modal con campos: Título, Monto Objetivo, Ahorrado Inicial, Fecha Límite y Selector de Color.
   - Al enviar:
     - Ejecutar `validarMetaAhorro()`.
     - Si inválido: Toast de error.
     - Si válido: Guardar en `state.goals`, persistir en `Storage.saveGoals()`, cerrar modal, refrescar vistas y Toast de éxito.
2. **Aporte Rápido (`openContributeGoalModal`):**
   - Modal con: Nombre de la meta, monto actual, e input "Monto a aportar ($)".
   - Al enviar:
     - Validar que el monto aportado sea mayor a cero.
     - Ejecutar `aplicarAporteMeta(targetGoal, aporte)`.
     - Actualizar `state.goals`, persistir en `Storage.saveGoals()`, cerrar modal, refrescar vistas y Toast de éxito (`¡Aporte de $X sumado a la meta!`).

---

## 5. Estrategia de Pruebas (TDD Red-Green)
- `tests/goals.test.js`:
  1. `validarMetaAhorro` rechaza datos nulos o vacíos.
  2. `validarMetaAhorro` rechaza título vacío o solo espacios.
  3. `validarMetaAhorro` rechaza monto objetivo menor o igual a cero.
  4. `validarMetaAhorro` aprueba datos válidos.
  5. `calcularProgresoMeta` calcula porcentaje exacto y saldo restante.
  6. `calcularProgresoMeta` identifica meta cumplida cuando `currentAmount >= targetAmount`.
  7. `aplicarAporteMeta` incrementa el monto acumulado de forma inmutable y rechaza aportes negativos.

