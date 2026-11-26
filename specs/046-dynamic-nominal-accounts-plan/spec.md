# SPEC-046: Dinamismo Estricto de Cuentas Nominales en Plan de Cuentas y Purgado de Saldos Residuales

## 1. Contexto y Justificación
En el Plan de Cuentas Contable, la cuenta base `5.3.01` ("Transporte & Combustible") y la cuenta `5.1.01` ("Luz / Vivienda") exhibían movimientos acumulados de `$35.000` y `$408.000` respectivamente, a pesar de que el usuario no tenía transacciones asociadas a dichas cuentas.

La investigación determinó que:
1. Dichos valores correspondían a transacciones de demostración iniciales (`TX-2026-004` de $35.000 para transporte y `TX-2026-002` de $408.000 para vivienda).
2. Al momento en que el usuario interactuó con dichas cuentas (para editarlas o crear subcuentas como `5.3.01.01`, `5.3.01.02`, `5.3.01.03`), el modal de guardado persistió el valor de `existing.periodMovement` de manera estática y serializada dentro de `state.planAccounts` en `localStorage` y en Cloud Firestore.
3. El motor `obtenerCatalogoPlanCuentas` adoptaba dicho `periodMovement` persistido como base inicial antes de sumar las transacciones reales.

Contablemente, las cuentas de Clase 4 (Ingresos) y Clase 5 (Gastos) son cuentas de resultado (nominales o transitorias). No poseen saldos iniciales ni remanentes estáticos; su movimiento en el período debe derivarse **única y exclusivamente** de la acumulación dinámica de las transacciones vivas del Libro de Movimientos.

## 2. Lenguaje Ubicuo (Ubiquitous Language)
- **Cuentas Nominales / De Resultado:** Cuentas pertenecientes a Clase 4 (Ingresos) y Clase 5 (Gastos) cuyo saldo no es acumulativo de balance patrimonial, sino flujo del período contable.
- **Movimiento del Período (`periodMovement`):** Importe total de transacciones acumuladas en el período para cuentas de ingresos y gastos.
- **Saneamiento de Cuentas Nominales:** Proceso de purga que garantiza que ninguna cuenta de Clase 4 o 5 conserve saldos estáticos huérfanos o residuales en memoria o almacenamiento persistente.

## 3. Requisitos Funcionales (EARS)

### Ubiquitous / Siempre activos
- **RF-1 (Inicialización en Cero para Cuentas Nominales):** Cuando `obtenerCatalogoPlanCuentas` integra cuentas personalizadas (`cuentasPersonalizadas`), el sistema **debe** forzar `periodMovement = 0` y `balance = 0` para todas las cuentas de Clase 4 y Clase 5, impidiendo la adopción de valores estáticos congelados en `p.periodMovement`.
- **RF-2 (Acumulación Exclusivamente Dinámica):** El sistema **debe** calcular `periodMovement` para cuentas de Clase 4 y 5 sumando exclusivamente las transacciones reales provistas en el parámetro `transacciones`. Si no hay transacciones para una cuenta, su valor resultante **debe** ser estrictamente $0$.
- **RF-3 (Prioridad de Asociación por Código Contable):** Al acumular transacciones en el catálogo contable, el sistema **debe** verificar primero coincidencia exacta o por código contable (`tx.categoryCode`), y solo en ausencia de este realizar la coincidencia por texto de categoría (`matchCategory`).
- **RF-4 (Persistencia Limpia en Modal):** Al guardar o actualizar una cuenta contable en `openPlanAccountModal`, si la cuenta pertenece a Clase 4 o 5, el sistema **debe** persistir `periodMovement: 0` y `balance: 0`, previniendo el congelamiento de movimientos dinámicos en `state.planAccounts`.
- **RF-5 (Función de Saneamiento en Carga):** El sistema **debe** proveer `Calculations.sanearCuentasPlanNominales(cuentasPlan)` que neutralice a 0 cualquier residuo en `periodMovement` y `balance` para cuentas de Clase 4 y 5, ejecutándose durante `loadStateFromStorage` y sincronizándose a Firestore.

## 4. Requisitos No Funcionales (NFR)
- **RNF-1 (Exactitud Contable):** La suma total de gastos e ingresos en el Plan de Cuentas debe coincidir al centavo con los reportes de resultados y transacciones.
- **RNF-2 (Cero Regresiones):** No deben alterarse los saldos reales de cuentas patrimoniales (Clases 1, 2 y 3) asociadas a cuentas financieras.
- **RNF-3 (Caché PWA):** Actualizar Service Worker a `contapersonal-v29` en `sw.js`.
