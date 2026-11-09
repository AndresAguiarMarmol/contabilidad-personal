# SPEC.md — Especificación Técnica y Arquitectura del Producto

## 1. Visión del Producto
**Sistema Integrado de Contabilidad, Inventario y Pedidos para Negocios de Ventas de Insumos.**
Herramienta web ágil, visual y autónoma que centraliza en un único entorno el control de existencias con alertas de reabastecimiento en tiempo real, el procesamiento de pedidos con descuento automático de stock y el registro contable inmediato de ingresos y egresos para conocer la salud financiera del negocio sin complejidad administrativa.

---

## 2. Alcance del MVP

### Lo que SÍ incluye el MVP (In-Scope):
1. **Catálogo Visual e Inventario de Insumos:**
   - Visualización en cuadrícula (tarjetas con foto) y tabla con filtros rápidos (por categoría, por estado de stock).
   - Semáforo de stock por insumo:
     - 🟢 **Óptimo:** Stock actual > Stock mínimo.
     - 🟡 **Bajo:** Stock actual $\le$ Stock mínimo y > Stock crítico.
     - 🔴 **Crítico:** Stock actual $\le$ Stock crítico y > 0.
     - ⚫ **Agotado:** Stock actual = 0.
   - Creación y edición de insumos (SKU, nombre, categoría, unidad de medida, precio costo, precio venta, stock actual, stock mínimo, stock crítico, imagen en URL o Base64).
   - Registro rápido de entrada de stock (reposición de compra con impacto en egresos contables).

2. **Gestión de Pedidos / Ventas:**
   - Creación de nuevo pedido con selección dinámica de insumos y cantidades.
   - Validación de stock disponible antes de confirmar (previene vender más de lo existente).
   - Descuento automático de stock de los insumos al confirmar pedido.
   - Cálculo automático de subtotal, costo total y margen del pedido.
   - Historial de pedidos con detalle de líneas y estado (Completado / Cancelado con reversión de stock).

3. **Módulo Contable y Financiero:**
   - Registro automático de **Ingresos** originados por pedidos confirmados.
   - Registro automático de **Egresos** originados por reposición de insumos o gastos operativos manuales.
   - Panel de resumen financiero en tiempo real:
     - Total Ingresos acumulados.
     - Total Egresos acumulados.
     - Balance Neto en Caja.
     - Margen Bruto estimado (% y monto).
   - Libro de movimientos con filtros por tipo (Ingreso / Egreso) y fecha.

4. **Persistencia y Utilidades:**
   - Carga inicial de datos de demostración realistas (`mockData.js`).
   - Persistencia reactiva local (`localStorage` con fallback robusto).
   - Botón de reinicio ("Restablecer datos demo").
   - Exportación e importación de respaldo completo en formato JSON.
   - Soporte para Tema Claro / Tema Oscuro.

### Lo que NO incluye el MVP (Out-of-Scope para Fase 1):
- Autenticación multiusuario o roles con backend en la nube.
- Facturación electrónica gubernamental / AFIP / SAT / SII.
- Pasarelas de pago online con tarjeta de crédito (Stripe, Mercado Pago).
- Manejo de múltiples sucursales físicas o almacenes multidepósito.

---

## 3. Arquitectura del Sistema y Estructura de Archivos

Arquitectura **Full-Client Single Page Application (SPA)** modular sin bundlers (`Vanilla ES6 Modules`), ejecutable con cualquier servidor estático local o doble clic (`file://`).

```
d:\Carpetas\Desarrollos\Desarrollos WEB\Contabilidad Personal\
├── index.html                     # Shell principal SPA (Layout, Nav, Contenedores de vista)
├── SPEC.md                        # Documento de especificación arquitectónica (este archivo)
├── AGENTS.md                      # Instrucciones operativas para agentes
├── memory.md                      # Memoria persistente de decisiones y cambios
├── PROMPT_ANTIGRAVITY_FASE_1.md    # Prompt de ejecución para el agente
├── assets/
│   ├── css/
│   │   └── styles.css             # Clases personalizadas, scrollbars y animaciones suaves
│   └── js/
│       ├── app.js                 # Coordinador principal, router de vistas y ciclo de vida
│       ├── mockData.js            # Semilla de datos iniciales (Insumos, Pedidos, Movimientos)
│       ├── storage.js             # Capa de persistencia (localStorage + backup JSON)
│       └── modules/
│           ├── inventory.js       # Lógica de insumos, umbrales y alertas de stock
│           ├── orders.js          # Creación, cálculo y descuento de stock por pedidos
│           ├── accounting.js      # Libro contable, balances y márgenes financieros
│           └── ui.js              # Helpers de renderizado, modales, toasts y formateadores
```

---

## 4. Modelos de Datos (Tipos Base)

### 4.1 Insumo (`SupplyItem`)
```typescript
interface SupplyItem {
  id: string;               // UUID o slug único (ej. "INS-001")
  sku: string;              // Código identificador único (ej. "TELA-ALGODON-01")
  name: string;             // Nombre del insumo (ej. "Tela Algodón 100% Crudo")
  description?: string;     // Descripción detallada
  category: string;         // Ej. "Telas", "Hilos", "Botones", "Empaques", "Tintas"
  unit: string;             // Ej. "Metro", "Bobina", "Unidad", "Kg", "Litro"
  costPrice: number;        // Precio de costo unitario (ej. 1500)
  salePrice: number;        // Precio de venta unitario (ej. 2800)
  currentStock: number;     // Cantidad actual disponible
  minStock: number;         // Umbral de stock bajo
  criticalStock: number;    // Umbral de stock crítico
  imageUrl: string;         // URL externa o imagen placeholder SVG/dataURL
  updatedAt: string;        // ISO 8601 (ej. "2026-11-09T09:00:00Z")
}
```

### 4.2 Nivel de Alerta de Stock (`StockAlertLevel`)
```typescript
type StockAlertLevel = 'optimal' | 'low' | 'critical' | 'out_of_stock';

// Regla de cálculo:
// currentStock <= 0 => 'out_of_stock'
// currentStock <= criticalStock => 'critical'
// currentStock <= minStock => 'low'
// currentStock > minStock => 'optimal'
```

### 4.3 Pedido / Venta (`Order`)
```typescript
interface OrderItem {
  supplyId: string;         // ID del insumo
  name: string;             // Nombre snapshot del insumo
  quantity: number;         // Cantidad solicitada
  costPrice: number;        // Costo unitario al momento de venta
  salePrice: number;        // Precio de venta unitario
  subtotal: number;         // quantity * salePrice
}

interface Order {
  id: string;               // UUID o código (ej. "PED-2026-001")
  orderNumber: number;      // Número secuencial
  date: string;             // ISO 8601
  customerName: string;     // Nombre de cliente o "Venta Mostrador"
  items: OrderItem[];       // Líneas del pedido
  totalCost: number;        // Suma de (item.quantity * item.costPrice)
  totalAmount: number;      // Suma de item.subtotal
  grossProfit: number;      // totalAmount - totalCost
  status: 'completed' | 'cancelled';
  notes?: string;
}
```

### 4.4 Asiento Contable (`AccountingEntry`)
```typescript
interface AccountingEntry {
  id: string;               // UUID (ej. "TX-001")
  date: string;             // ISO 8601
  type: 'income' | 'expense';
  category: 'sale' | 'restock' | 'operating_expense' | 'other';
  concept: string;          // Ej. "Cobro Pedido PED-2026-001" o "Compra Reposición Tela"
  amount: number;           // Monto positivo
  referenceId?: string;     // ID del pedido o ID del insumo asociado
  paymentMethod: 'cash' | 'transfer' | 'card';
}
```

---

## 5. Reglas de Negocio y Desarrollo

1. **Atomicidad de Transacciones:**
   - Al confirmar un pedido:
     1. Se valida que cada insumo tenga `currentStock >= quantity`.
     2. Se decrementa `currentStock` de cada insumo.
     3. Se guarda el pedido en el listado con estado `'completed'`.
     4. Se crea automáticamente un asiento de tipo `'income'` en contabilidad.
2. **Reversión de Stock:**
   - Si un pedido se cancela, se reintegran las cantidades exactas al stock y se registra un contra-asiento o anulación contable.
3. **Persistencia Reactiva:**
   - Todo cambio de estado (creación de insumo, actualización, venta, movimiento contable) debe llamar inmediatamente a `Storage.saveAll()`.
4. **Resiliencia de Datos:**
   - Si `localStorage` está vacío o corrupto, se inicializa automáticamente con `mockData.js`.
5. **UI & Accesibilidad:**
   - Toda acción destructiva (ej. borrar insumo, cancelar pedido, resetear datos) debe requerir confirmación modal explícita.
   - Notificaciones toast flotantes no intrusivas para confirmar operaciones ("Pedido creado con éxito", "Stock actualizado").
   - Totalmente responsivo: Sidebar colapsable en pantallas móviles (`< 768px`).
