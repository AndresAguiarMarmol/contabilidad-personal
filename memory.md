# memory.md — Memoria del proyecto

Registro de todo lo que debe preservarse entre sesiones de trabajo: arquitectura de datos, decisiones técnicas tomadas e historial de cambios.
**Los agentes deben leer este archivo antes de empezar y actualizarlo al terminar cada tarea** (ver `AGENTS.md`).

---

## 1. Estructura de datos y persistencia

### A. Persistencia en `localStorage`
- **Clave:** `supply_inventory_data`
  - Array de objetos `SupplyItem`: `id`, `sku`, `name`, `description`, `category`, `unit`, `costPrice`, `salePrice`, `currentStock`, `minStock`, `criticalStock`, `imageUrl`, `updatedAt`.
- **Clave:** `supply_orders_data`
  - Array de objetos `Order`: `id`, `orderNumber`, `date`, `customerName`, `items` (array con `supplyId`, `name`, `quantity`, `costPrice`, `salePrice`, `subtotal`), `totalCost`, `totalAmount`, `grossProfit`, `status`.
- **Clave:** `supply_accounting_data`
  - Array de objetos `AccountingEntry`: `id`, `date`, `type` (`"income"` | `"expense"`), `category`, `concept`, `amount`, `referenceId`, `paymentMethod`.
- **Clave:** `supply_theme`
  - Valores: `"dark"` | `"light"`. Gestiona el modo de color persistido en el atributo `class` de `<html>`.

### B. Fuente semilla de datos (`mockData.js`)
- En ausencia de datos en `localStorage` o al pulsar el botón "Restablecer datos demo", la aplicación inicializa el estado con `mockData.js`.

---

## 2. Decisiones vigentes

- **Arquitectura:** Full-Client SPA modular con Vanilla ES6 (`assets/js/`) sin necesidad de empaquetadores (Node/npm), compatible con doble clic (`file://`) o cualquier servidor estático local (`python -m http.server`, Live Server, GitHub Pages).
- **Framework visual:** Tailwind CSS vía CDN con paleta personalizada `brand` y soporte nativo para `class="dark"`.
- **Iconos:** Lucide Icons vía CDN con invocación centralizada `lucide.createIcons()`.
- **Semáforo de stock:**
  - `Stock <= 0` $\rightarrow$ Agotado (`out_of_stock`).
  - `Stock <= criticalStock` $\rightarrow$ Crítico (`critical`).
  - `Stock <= minStock` $\rightarrow$ Bajo (`low`).
  - `Stock > minStock` $\rightarrow$ Óptimo (`optimal`).
- **Integración Contable Automática:** Todo pedido confirmado genera automáticamente un asiento de tipo `income`. Toda reposición de stock genera un asiento de tipo `expense`.
- **Estructura y Reglas:** Definidas y congeladas en [SPEC.md](file:///d:/Carpetas/Desarrollos/Desarrollos%20WEB/Contabilidad%20Personal/SPEC.md).

---

## 3. Historial de cambios

- **2026-11-09:** Implementación exitosa de la **Fase 1 (Shell Visual Completo)**:
  - Creada estructura `assets/css/styles.css`, `assets/js/mockData.js`, `assets/js/storage.js`, `assets/js/app.js` e `index.html`.
  - Implementada navegación reactiva entre las 4 vistas (Dashboard, Catálogo & Stock, Pedidos, Contabilidad).
  - Integrado soporte Dark/Light mode con persistencia local.
  - Diseñado catálogo visual con cálculo automático de semáforos de stock, barras de progreso y cálculo de margen de ganancia.
  - Implementadas tarjetas de KPI financiero, alertas urgentes de inventario, libro contable y tabla de pedidos.
  - Verificación de sintaxis JS con `node --check` completada al 100%.
- **2026-11-09:** Culminación de la Fase 1 y 2 de Arquitectura. Generación de [SPEC.md](file:///d:/Carpetas/Desarrollos/Desarrollos%20WEB/Contabilidad%20Personal/SPEC.md) y [PROMPT_ANTIGRAVITY_FASE_1.md](file:///d:/Carpetas/Desarrollos/Desarrollos%20WEB/Contabilidad%20Personal/PROMPT_ANTIGRAVITY_FASE_1.md).
- **2026-11-09:** Limpieza completa del workspace anterior e inicio del nuevo proyecto.
