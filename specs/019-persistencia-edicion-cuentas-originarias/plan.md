# Plan Técnico — Spec 019: Persistencia y Precedencia en Modificación de Cuentas Originarias del Plan de Cuentas

## 1. Arquitectura de la Solución

### A. Capa de Cálculo Puro (`financeCalculations.js`)
- En `obtenerCatalogoPlanCuentas(cuentasPersonalizadas, cuentasFinancieras, transacciones)`:
  1. Clonar `CATALOGO_PLAN_CUENTAS_PERSONAL_BASE`.
  2. Mapear las cuentas personalizadas:
     - Para cada cuenta personalizada `p`:
       - Buscar si coincide con alguna cuenta base por `id` (ej. `p.id === c.id`) o por `c.code === p.code` (o si `p.baseCode === c.code`).
       - Si existe en el catálogo base: **sobrescribir** los atributos del elemento base con los valores de `p` (`{ ...c, ...p, isSystem: false }`).
       - Si no existe: añadirla como cuenta nueva (`catalogo.push(...)`).
  3. Integrar cuentas financieras reales vinculadas:
     - Si la cuenta financiera tiene `acc.codigoContable`, respetarlo prioritariamente sobre el código generado por defecto `${parentCode}.${idx + 1}`.
     - Vincular por `acc.id` asegurando que el nombre y saldo contable actualizado se reflejen en la fila correspondiente del catálogo.

### B. Capa de Aplicación (`app.js`)
- En `openPlanAccountModal(planAccountId)`:
  - Eliminar restricciones excesivas (`readonly`/`disabled`) en campos de cuentas originarias para permitir editar Nombre, Rubro/Grupo, Naturaleza y Código Contable según la Decisión 1 (Opción A).
  - Al enviar el formulario:
    - Conservar el `existing.id` original (`P-...`) al actualizar o crear la entrada en `state.planAccounts`.
    - Registrar `baseCode: existing.code` si se cambia el código contable, para permitir a `obtenerCatalogoPlanCuentas` ubicar y sustituir la cuenta base original sin duplicación.
    - Persistir en `Storage.savePlanAccounts(state.planAccounts)` y disparar `triggerAutoSync()`.

### C. Capa de Fusión Multi-Dispositivo (`financeCalculations.js`)
- En `fusionarEstadoContable()`:
  - Garantizar que las cuentas en `planAccounts` con modificaciones prevalezcan sobre versiones vacías o estáticas.

## 2. Estrategia TDD
- Crear pruebas unitarias en `tests/plan-accounts-custom.test.js`:
  1. `obtenerCatalogoPlanCuentas` sobrescribe nombre y grupo de una cuenta base originaria (`P-5-1-01`).
  2. `obtenerCatalogoPlanCuentas` permite modificar el código contable de una cuenta base sin duplicar la cuenta originaria.
  3. `obtenerCategoriasDesdePlan` devuelve los nombres actualizados de las cuentas originarias modificadas.
  4. `fusionarEstadoContable` conserva las modificaciones sobre cuentas base entre dispositivos.
