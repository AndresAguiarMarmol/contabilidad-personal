# Tareas de Implementación — Spec 013 (Cuentas Secundarias a Cuentas Base en Plan de Cuentas)

- [x] **T1: TDD Red (Suite de pruebas unitarias para subcuentas contables)**
  - Crear archivo `tests/subaccounts-plan.test.js`.
  - Diseñar casos de prueba:
    1. `generarSiguienteCodigoSubcuenta` para primer correlativo `.01`.
    2. `generarSiguienteCodigoSubcuenta` con correlativos preexistentes (salta a `.03` si existen `.01` y `.02`).
    3. `validarCuentaPlan` validando jerarquía de código contra `parentCode`.
    4. `validarCuentaPlan` rechazando código que no respeta prefijo de la cuenta padre.
    5. `obtenerCatalogoPlanCuentas` y `obtenerCategoriasDesdePlan` integrando subcuentas en categorías y árbol jerárquico.
  - Ejecutar `node --test tests/subaccounts-plan.test.js` y confirmar fallo controlado (Fase Red).

- [x] **T2: TDD Green (Implementación de funciones puras en `financeCalculations.js`)**
  - Implementar `generarSiguienteCodigoSubcuenta(parentCode, catalogoExistente)`.
  - Adaptar `validarCuentaPlan` para validar consistencia de subcuenta y cuenta padre.
  - Exportar funciones en `window.ContaPersonal.Calculations` y `module.exports`.
  - Ejecutar `node --test tests/subaccounts-plan.test.js` y verificar paso al 100% en verde (Fase Green).

- [x] **T3: Integración en Interfaz de Usuario (`app.js`)**
  - Actualizar `openPlanAccountModal` para soportar `preselectedParentCode`.
  - Incorporar selector de "Cuenta Base / Padre" en el formulario del modal.
  - Conectar listener reactivo: al cambiar la cuenta padre, heredar clase, grupo y naturaleza, y autogenerar el código correlativo.
  - Incorporar botón rápido `+ Subcuenta` en las filas de cuentas base en `renderChartOfAccounts()`.
  - Renderizar visualmente las subcuentas indentadas con símbolo `↳` y badge `Subcuenta`.

- [x] **T4: Verificación Integral de Pruebas y Consistencia**
  - Ejecutar `node --test tests/*.test.js` asegurando que el 100% de las suites pasen en verde (62/62 tests).
  - Verificar sintaxis con `node -c assets/js/financeCalculations.js` y `node -c assets/js/app.js`.

- [x] **T5: Sincronización en GitHub y Gobernanza**
  - Marcar DoD en `specs/013-cuentas-secundarias-plan/spec.md`.
  - Actualizar `memory.md` (decisiones e historial de cambios).
  - Hacer commit convencional y push a `origin main`.
