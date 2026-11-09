# Plan Técnico — Spec 004 (Movimientos Divididos / Split Transactions)

## 1. Archivos Involucrados y Responsabilidades
- `assets/js/financeCalculations.js`: Lógica pura de validación e impacto patrimonial:
  - `validarMovimientoSplit(tx, cuentasExistentes)`: Valida cabecera, arreglo de líneas split, montos mayores a cero, unicidad de origen-destino y cuadratura contable estricta ($\sum \text{líneas} = \text{monto total}$).
  - `aplicarMovimientoSplitEnCuentas(accounts, tx)`: Aplica de forma atómica e inmutable el débito del total en la cuenta pagadora y el abono individual en las cuentas receptoras correspondientes (para líneas patrimoniales/transferencias internas).
- `tests/split-transactions.test.js`: Suite de pruebas unitarias automatizadas con `node --test` para verificar todos los requisitos EARS de Spec 004.
- `assets/js/app.js`: Interfaz de usuario y flujo en `<dialog id="app-modal">`:
  - Casilla o interruptor "Dividir movimiento (Split)" dentro de `openTransactionModal()`.
  - Contenedor dinámico de partidas con selector de categoría, descripción de la partida, monto y cuenta de destino opcional (para transferir a cuentas de activos u otras cuentas).
  - Botones interactivos "+ Añadir partida" y "- Eliminar partida" (mínimo 2 partidas).
  - Indicador reactivo en tiempo real de cuadratura: Total Cabecera vs Total Asignado vs Diferencia (con feedback visual verde si cuadra, rojo/ámbar si hay diferencia).
  - Integración en la tabla de movimientos: etiqueta visual "Split (N partidas)" y desglose expandible/visible de las líneas.

---

## 2. Modelos de Datos para Movimiento Split

```javascript
// Estructura de la transacción Split
{
  id: "TX-1731150000000",
  date: "2026-11-09T12:00:00",
  type: "expense", // o "split"
  amount: 1000000,
  description: "Compra Grandes Tiendas",
  accountId: "ACC-005", // Cuenta pagadora (ej. Tarjeta de Crédito)
  category: "Varios (Split)",
  isSplit: true,
  splitLines: [
    {
      id: "spl-1",
      description: "Aspiradora",
      amount: 80000,
      category: "Activos del Hogar",
      targetAccountId: "ACC-006" // Opcional: Afecta cuenta de activos o permanece como gasto puro si es null
    },
    {
      id: "spl-2",
      description: "Televisor",
      amount: 920000,
      category: "Electrónica y Computación",
      targetAccountId: "ACC-007" // Opcional
    }
  ]
}
```

---

## 3. Algoritmo de Validación (`validarMovimientoSplit`)
1. Verificar que `tx` sea un objeto no nulo.
2. Verificar que `tx.amount` sea un número válido y mayor a cero.
3. Verificar que `tx.accountId` esté definido y exista en `cuentasExistentes`.
4. Verificar que `tx.splitLines` sea un arreglo con al menos 2 elementos.
5. Para cada línea:
   - `amount` debe ser un número mayor a cero.
   - Si tiene `targetAccountId`, no puede ser igual a `tx.accountId` (origen).
   - Debe tener al menos una descripción o categoría asignada.
6. Calcular $\text{totalLineas} = \sum \text{line.amount}$.
7. Calcular $\text{diferencia} = \text{tx.amount} - \text{totalLineas}$.
8. Si $|\text{diferencia}| > 0.001$:
   - Retornar `{ valida: false, error: "La suma de las partidas no cuadra con el monto total...", sumLines: totalLineas, difference: diferencia }`.
9. Retornar `{ valida: true, sumLines: totalLineas, difference: 0 }`.

---

## 4. Algoritmo de Aplicación de Saldos (`aplicarMovimientoSplitEnCuentas`)
1. Generar copia inmutable de `accounts`.
2. Restar `tx.amount` de la cuenta pagadora `tx.accountId`.
3. Recorrer `tx.splitLines`:
   - Si la línea tiene `targetAccountId` válido:
     - Sumar `line.amount` a la cuenta correspondiente `line.targetAccountId`.
4. Retornar el nuevo arreglo de cuentas con todos los saldos recalculados atómicamente.

---

## 5. Diseño de Interfaz y Experiencia de Usuario (UI/UX)
- Se añade un switch o checkbox visible: `Dividir movimiento (Split)` con icono y badge.
- Al activarse:
  - Se oculta el selector único de categoría global (o pasa a "Varios (Split)").
  - Se despliega el panel de líneas split con dos partidas por defecto.
  - Cada fila incluye:
    - Input de descripción / concepto de la partida.
    - Input de monto de la partida.
    - Selector de destino (Categoría de gasto o Cuenta patrimonial/activo receptora).
    - Botón de eliminar línea (activo si hay más de 2 líneas).
  - Barra de resumen de cuadratura al pie:
    - `Monto Total: $1.000.000` | `Desglosado: $1.000.000` | `Diferencia: $0` (badge verde `Cuadrado ✓`).
    - Si hay desfase: badge rojo con `Faltan $X` o `Sobran $X`.
- Al enviar:
  - Valida la cuadratura y campos obligatorios.
  - Actualiza el estado de cuentas y transacciones.
  - Guarda en `Storage` y refresca el Dashboard y la vista de Movimientos.

---

## 6. Estrategia de Pruebas (TDD Red-Green)
- `tests/split-transactions.test.js`:
  1. Rechaza split con menos de 2 líneas.
  2. Rechaza split si alguna línea tiene monto negativo o cero.
  3. Rechaza split si la suma de líneas no es igual al monto total de la cabecera.
  4. Rechaza split si una línea transfiere a la misma cuenta de origen.
  5. Aprueba split perfectamente cuadrado ($\Delta = 0$).
  6. Aplica correctamente el impacto: debita cuenta origen por el total y acredita cuentas destino por sus respectivos montos.

