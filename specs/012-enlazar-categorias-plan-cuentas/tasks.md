# Tareas de Implementación — Spec 012 (Enlace de Categorías con el Plan de Cuentas)

- [x] **T1: TDD Red (Suite de pruebas unitarias de enlace de categorías con el Plan de Cuentas)**
  - Crear archivo `tests/category-plan-link.test.js`.
  - Diseñar casos de prueba:
    1. `obtenerCategoriasDesdePlan` para gastos (Clase 5).
    2. `obtenerCategoriasDesdePlan` para ingresos (Clase 4).
    3. `obtenerCategoriasDesdePlan` para modo Split (Clase 5 + Activos 1.3).
    4. `resolverCategoriaPlan` por código y por nombre.
    5. Reactividad ante cuentas personalizadas del usuario.
  - Ejecutar `node --test tests/category-plan-link.test.js` y confirmar fallo controlado (fase Red).

- [x] **T2: TDD Green (Implementación de funciones puras en `financeCalculations.js`)**
  - Implementar `obtenerCategoriasDesdePlan` y `resolverCategoriaPlan`.
  - Exportar funciones en `window.ContaPersonal.Calculations` y `module.exports`.
  - Ejecutar `node --test tests/category-plan-link.test.js` y verificar paso al 100% en verde.

- [x] **T3: Integración en la Interfaz de Usuario (`app.js`)**
  - Actualizar `openTransactionModal`: poblar `#tx-input-category` dinámicamente con las cuentas del Plan de Cuentas según el tipo (Gasto o Ingreso).
  - Almacenar `category` y `categoryCode` al guardar transacciones.
  - Actualizar el repetidor dinámico de partidas Split para incluir cuentas de Gastos y Activos Fijos del Plan de Cuentas.
  - Actualizar `#tx-category-filter` en `renderTransactions()`.
  - Actualizar `#budget-input-category` en `openBudgetModal()`.
  - Enriquecer la visualización de categorías en tablas con el código contable normalizado.

- [x] **T4: Verificación Integral de Pruebas y Consistencia**
  - Ejecutar `node --test tests/*.test.js` asegurando que el 100% de las suites pasen en verde (57/57 tests).
  - Verificar visualmente y sintácticamente sin errores.

- [x] **T5: Sincronización en GitHub y Gobernanza**
  - Completar DoD en `specs/012-enlazar-categorias-plan-cuentas/spec.md`.
  - Actualizar `memory.md` (decisiones y registro de cambios).
  - Hacer commit con convención y push a `origin main`.
