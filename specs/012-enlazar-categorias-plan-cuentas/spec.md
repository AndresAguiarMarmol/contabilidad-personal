# Spec 012 — Enlace de Categorías de Movimientos con el Plan de Cuentas Contable

Estado: implementada

## 1. Contexto y Objetivo
En la aplicación de contabilidad personal, el registro de movimientos (ingresos, gastos y partidas split) utilizaba listas estáticas de categorías (`EXPENSE_CATEGORIES` e `INCOME_CATEGORIES`). Con la implementación del **Plan de Cuentas Contable Personal** (Spec 011), las categorías no deben estar desvinculadas del sistema contable, sino que deben emanar directamente del catálogo maestro de cuentas:
- **Gastos:** Cuentas de la **Clase 5: Gastos** (ej. `5.1.01`, `5.2.01`, etc.) y cualquier cuenta de gasto personalizada creada por el usuario.
- **Ingresos:** Cuentas de la **Clase 4: Ingresos** (ej. `4.1.01`, `4.2.01`, etc.) y cuentas de ingreso personalizadas.
- **Movimientos Split:** Permite seleccionar cuentas de la **Clase 5: Gastos** y también cuentas de inversión/bienes personales de la **Clase 1.3: Bienes y Activos Fijos** (ej. `1.3.03 Tecnología y Computación`, `1.3.04 Mobiliario del Hogar`), además de transferencias entre cuentas bancarias.

El objetivo es:
1. Enlazar de forma dinámica el selector de categorías de nuevos movimientos con el **Plan de Cuentas Contable**.
2. Almacenar el código contable (`categoryCode`) y el nombre de la cuenta en cada transacción registrada.
3. Actualizar los filtros multidimensionales de movimientos y de presupuestos para que se alimenten del Plan de Cuentas.
4. Reflejar en la vista de transacciones y detalle de cuentas el código contable normalizado (ej. `5.2.01 · Alimentación & Supermercado`).
5. Sincronizar de inmediato cualquier cuenta contable nueva creada en el Plan de Cuentas para que aparezca disponible en el selector de movimientos.

---

## 2. Usuarios e Historias de Usuario
- **HU-1:** Como usuario, al registrar un gasto o ingreso, quiero que las opciones del selector de categoría correspondan exactamente a las cuentas de mi Plan de Cuentas Contable con su código formal (ej. `5.2.01 · Alimentación & Supermercado`).
- **HU-2:** Como usuario, si agrego una nueva cuenta de gasto o ingreso en el Plan de Cuentas (CRUD), quiero verla disponible de inmediato en la planilla de nuevos movimientos sin reiniciar la aplicación.
- **HU-3:** Como usuario, en movimientos tipo Split, quiero poder imputar partidas tanto a cuentas de gasto (Clase 5) como a cuentas de bienes/activos del hogar (Clase 1.3).
- **HU-4:** Como usuario, quiero ver en el Libro de Movimientos y en el Detalle de Cuenta el código contable asociado a cada categoría para mayor claridad y rigor financiero.
- **HU-5:** Como usuario, quiero que el filtro por categoría del Libro de Movimientos se alimente automáticamente del catálogo contable consolidado.

---

## 3. Requisitos Funcionales (EARS)

- **RF-1 (Comportamiento continuo / Obtención de categorías):** MIENTRAS la planilla modal de nuevo movimiento esté abierta, EL SISTEMA genera dinámicamente las opciones de categoría a partir del Plan de Cuentas Contable consolidado mediante la función pura `obtenerCategoriasDesdePlan(catalogoPlan, tipo)`.
- **RF-2 (Evento / Cambio de tipo de movimiento):** CUANDO el usuario conmuta entre "Gasto" e "Ingreso":
  - SI el tipo es "Gasto", EL SISTEMA puebla el selector con las cuentas de la Clase 5 (Gastos), mostrando formato `[Código] · [Nombre]`.
  - SI el tipo es "Ingreso", EL SISTEMA puebla el selector con las cuentas de la Clase 4 (Ingresos), mostrando formato `[Código] · [Nombre]`.
- **RF-3 (Comportamiento en Split):** MIENTRAS el modo Split esté activo en un gasto, EL SISTEMA permite en cada partida seleccionar entre:
  1. Cuentas de la Clase 5 (Gastos operacionales).
  2. Cuentas de la Clase 1.3 (Bienes y Activos del Hogar / Tecnología / Inversiones).
  3. Cuentas financieras de tesorería destino (bancos, billeteras).
- **RF-4 (Persistencia de datos):** CUANDO se guarda una transacción, EL SISTEMA persiste tanto la propiedad `category` (nombre amigable) como `categoryCode` (código contable normalizado), manteniendo compatibilidad retroactiva con transacciones previas.
- **RF-5 (Filtros y Presupuestos):** MIENTRAS se visualice el Libro de Movimientos o la planilla de presupuestos, EL SISTEMA puebla los selectores de categorías con las cuentas vigentes del Plan de Cuentas.
- **RF-6 (Lógica desacoplada y determinista):** EL SISTEMA implementa `obtenerCategoriasDesdePlan()`, `resolverCategoriaPlan()` y `formatearCategoriaConCodigo()` como funciones puras en `financeCalculations.js` con pruebas unitarias ejecutadas mediante `node --test`.

---

## 4. Requisitos No Funcionales
- **RNF-1:** Compatibilidad retroactiva total con transacciones existentes registradas antes del enlace.
- **RNF-2:** Funcionamiento offline sin dependencias externas, compatible con `file:///` y HTTP.
- **RNF-3:** Sincronización automática con `localStorage` y respaldo JSON.

---

## 5. Criterios de Finalización (DoD)
- [x] Función pura `obtenerCategoriasDesdePlan` implementada y testeada con `node --test`.
- [x] Función pura `resolverCategoriaPlan` y formateo de etiquetas implementadas y testeadas.
- [x] Modal de nuevo movimiento (`openTransactionModal`) enlazado dinámicamente al Plan de Cuentas para Gastos e Ingresos.
- [x] Repetidor de partidas Split enlazado a cuentas de Clase 5 (Gastos) y Clase 1.3 (Activos Fijos/Bienes).
- [x] Selector de filtro `#tx-category-filter` y selector de presupuestos alimentados del Plan de Cuentas.
- [x] Visualización del código contable en la tabla de transacciones.
- [x] 100% de pruebas unitarias en verde (57/57 pruebas pasando).
- [x] Actualización y sincronización con GitHub (`main`).
- [x] Registro en `memory.md`.
