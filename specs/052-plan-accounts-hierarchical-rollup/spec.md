# Spec 052: Totalización Jerárquica de Cuentas Padre en el Plan de Cuentas (Rollup)

## Estado
Aprobado por el usuario (Andrés) el 28 de Noviembre de 2026.

## Contexto y Diagnóstico
En el Plan de Cuentas Contable Personal, los movimientos y saldos se imputaban únicamente a la cuenta de destino específico. Cuando una cuenta padre posee subcuentas hijas (por ejemplo, `5.1.01` con hijas `5.1.01.01`, `5.1.01.02` y `5.1.01.03`), la cuenta padre reflejaba `$0` (o solo sus movimientos directos), en lugar de reflejar la suma consolidada de sus hijas.

Adicionalmente, en `Calculations.calcularResumenPlanCuentas`, si la cuenta padre totaliza a sus hijas, una iteración ciega de todas las filas duplicaría los totales de la clase (sumando tanto al padre como a los hijos).

## Requerimientos (EARS)
1. **[R1 - Consolidación Jerárquica Bottom-Up]:** En `Calculations.obtenerCatalogoPlanCuentas`, toda cuenta que posea cuentas hijas (subcuentas enlazadas por `parentCode` o por prefijo jerárquico de código `parent.code + "."`) DEBE totalizar la sumatoria de los montos de sus cuentas hijas:
   - Para cuentas nominales (Clases 4 y 5): `parent.periodMovement = parent_directo.periodMovement + sum(hijas.periodMovement)`.
   - Para cuentas de balance (Clases 1, 2 y 3): `parent.balance = parent_directo.balance + sum(hijas.balance)`.
   - Si una cuenta padre tiene 3 hijos con valores 1, 2 y 3, la cuenta padre DEBE contener 6 (más cualquier movimiento directo previo).
2. **[R2 - Soporte Multinivel]:** La consolidación DEBE procesarse en orden de profundidad decreciente (bottom-up), de modo que subcuentas de niveles inferiores se consoliden en sus padres inmediatos y estos a su vez en sus respectivos ancestros hasta la raíz.
3. **[R3 - Blindaje contra Doble Contabilización en Resúmenes]:** `Calculations.calcularResumenPlanCuentas` DEBE sumar únicamente las cuentas raíz de nivel superior (aquellas que no son hijas de otra cuenta en el catálogo), garantizando que los KPIs globales de la clase (Activos, Pasivos, Ingresos, Gastos) reflejen el monto exacto consolidado sin duplicar.
4. **[R4 - Consistencia en Reportes de Balance General]:** `Calculations.generarBalanceGeneral` DEBE considerar únicamente cuentas de detalle/imputables, evitando duplicar cuentas padre consolidadas con sus cuentas bancarias o subcuentas subordinadas.

## Casos de Prueba (TDD)
- Cuenta padre de Clase 5 (`5.1.01`) con 3 hijos de valores 1, 2 y 3 totaliza exactamente 6 en `periodMovement`.
- Cuenta padre con movimientos directos previos de 4 y 3 hijos de 1, 2 y 3 totaliza 10.
- Cuenta padre de Clase 1 (`1.1.02`) con 2 cuentas bancarias hijas ($1.500.000 y $500.000) totaliza exactamente $2.000.000 en `balance`.
- Consolidación multinivel de 3 niveles (`A` -> `A.01` -> `A.01.01`).
- `calcularResumenPlanCuentas` no duplica el total de la clase ante cuentas padre e hijas.
- Cero regresiones en el Balance General y Estado de Resultados.
