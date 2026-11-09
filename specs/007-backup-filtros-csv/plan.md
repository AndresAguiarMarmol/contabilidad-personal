# Plan Técnico — Spec 007 (Respaldo Integral y Filtros con CSV)

## 1. Archivos Involucrados y Responsabilidades
- `assets/js/financeCalculations.js`: Lógica pura de validación y transformación:
  - `validarBackupJSON(backupData)`: Valida estructura del JSON exportado, comprueba que `accounts` y `transactions` sean arreglos y cuenta los elementos.
  - `generarTransaccionesCSV(transactions, accounts)`: Genera el string CSV RFC 4180 con BOM `\uFEFF`, columnas `Fecha,Tipo,Concepto,Categoría,Cuenta,Medio de Pago,Monto,Es Split,Detalle Partidas`, manejando comillas, comas y desglose de partidas split.
  - `filtrarTransacciones(transactions, filtros)`: Filtra transacciones por texto de búsqueda, tipo, cuenta, categoría y rango de fechas.
- `tests/backup-and-export.test.js`: Suite de pruebas unitarias con `node --test` para validar las 3 funciones puras.
- `index.html`:
  - En la vista de transacciones (`view-transactions`): añadir selectores para filtrar por cuenta (`tx-account-filter`), categoría (`tx-category-filter`), rango de fechas (`tx-daterange-filter`), inputs opcionales de fecha personalizada y botón "Exportar CSV" (`btn-export-csv`).
- `assets/js/app.js`:
  - Enlazar filtros avanzados en `initFiltersAndEvents()` y en `renderTransactions()`.
  - Disparar descarga CSV con blob UTF-8 al pulsar `btn-export-csv`.
  - Enlazar `#input-import-json` con modal de confirmación informando el conteo de elementos validados antes de llamar a `Storage.importBackup()`.

---

## 2. Especificación de Columnas CSV
| Columna | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `Fecha` | Fecha en formato YYYY-MM-DD | `2026-11-09` |
| `Tipo` | Gasto, Ingreso o Transferencia | `Gasto` |
| `Concepto` | Descripción del movimiento | `"Compra Electrodomésticos y TV"` |
| `Categoría` | Categoría asignada | `"Varios (Split)"` |
| `Cuenta` | Nombre de la cuenta pagadora u origen | `"Tarjeta de Crédito Visa"` |
| `Medio de Pago` | Tarjeta de crédito, débito, transferencia, etc. | `"Tarjeta de Crédito"` |
| `Monto` | Monto numérico con signo | `-1000000` |
| `Es Split` | SI / NO | `SI` |
| `Detalle Partidas` | Desglose concatenado de cada partida | `"Aspiradora ($80000); Televisor ($920000)"` |

---

## 3. Algoritmo de Filtros (`filtrarTransacciones`)
1. Recorrer `transactions`.
2. Si `filtros.type !== "all"` y `tx.type !== filtros.type`, descartar.
3. Si `filtros.accountId !== "all"` y `tx.accountId !== filtros.accountId`, descartar.
4. Si `filtros.category !== "all"` y `tx.category !== filtros.category`:
   - Si no coincide `tx.category`, verificar si alguna línea en `tx.splitLines` tiene `line.category === filtros.category`. Si ninguna coincide, descartar.
5. Si `filtros.search`: verificar si `(tx.description || "").toLowerCase()` o `(tx.category || "").toLowerCase()` incluye el término buscado.
6. Si `filtros.dateRange`:
   - "current_month": `tx.date` comienza con mes actual (YYYY-MM).
   - "last_month": `tx.date` pertenece al mes calendario anterior.
   - "last_3_months": fecha dentro de los últimos 90 días.
   - "custom": `tx.date >= startDate && tx.date <= endDate`.
7. Retornar arreglo filtrado.

---

## 4. Estrategia de Pruebas (TDD Red-Green)
- `tests/backup-and-export.test.js`:
  1. `validarBackupJSON` rechaza datos nulos o que carezcan de arreglos de cuentas/transacciones.
  2. `validarBackupJSON` aprueba backup estructurado y retorna conteo de elementos.
  3. `generarTransaccionesCSV` genera encabezados correctos y escapa comas y comillas.
  4. `generarTransaccionesCSV` incluye desglose de movimientos split.
  5. `filtrarTransacciones` filtra adecuadamente por texto, cuenta, categoría y fechas.

