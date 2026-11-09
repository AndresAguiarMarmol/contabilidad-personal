# SPEC.md — Especificación Técnica y Arquitectura del Producto

## 1. Visión del Producto
**App de Contabilidad Personal y Gestión Patrimonial (PWA)**
Aplicación web progresiva (PWA), moderna, ágil e intuitiva, orientada al 100% a las **finanzas personales y familiares**. Permite tomar el control del dinero diario, gestionar múltiples cuentas bancarias y de efectivo, categorizar ingresos y gastos de la vida cotidiana, planificar presupuestos mensuales con alertas de sobregiro y construir metas de ahorro, con sincronización opcional a base de datos real (Supabase PostgreSQL / Firebase) y funcionamiento sin conexión garantizado.

> [!IMPORTANT]
> **Sin inventario ni catálogo comercial:** Este producto es exclusivamente para **Contabilidad y Finanzas Personales**. No contiene módulos de inventario, existencias de insumos, catálogos de venta ni pedidos a proveedores.

---

## 2. Alcance del MVP (Contabilidad Personal)

### Lo que SÍ incluye el MVP (In-Scope):
1. **Gestión de Cuentas y Saldos (Patrimonio Neto):**
   - Registro y control de múltiples cuentas financieras:
     - 💵 **Efectivo / Billetera**
     - 🏦 **Cuentas Bancarias / Débito** (ej. Banco Estado, Banco de Chile, BBVA, Galicia)
     - 💳 **Tarjetas de Crédito** (saldo consumido, límite y deuda)
     - 📱 **Billeteras Digitales** (MercadoPago, MACH, Fpay, PayPal)
     - 📈 **Cuentas de Ahorro / Inversión**
   - Transferencias entre cuentas propias con ajuste atómico de saldos.
   - Cálculo del **Patrimonio Neto Total** = $\sum(\text{Activos y Ahorros}) - \sum(\text{Deudas y Tarjetas})$.

2. **Registro y Control de Ingresos y Gastos:**
   - Alta rápida de movimientos: Tipo (Ingreso / Gasto / Transferencia), Cuenta, Categoría, Monto, Fecha, Descripción y Método de pago.
   - **Categorías de Gasto Personal:**
     - 🏠 *Vivienda & Servicios:* Alquiler/Hipoteca, Luz, Agua, Gas, Internet.
     - 🛒 *Alimentación & Supermercado:* Compras del mes, verdulería, panadería.
     - 🚗 *Transporte:* Combustible, transporte público, mantenimiento, estacionamiento.
     - 🩺 *Salud & Bienestar:* Farmacia, consultas médicas, deporte.
     - 🍿 *Ocio & Salidas:* Restaurantes, cine, delivery, suscripciones (Netflix, Spotify).
     - 📚 *Educación & Formación:* Libros, cursos, colegiaturas.
     - 🛍️ *Ropa & Cuidado Personal:* Vestimenta, peluquería.
     - 🔄 *Otros Gastos.*
   - **Categorías de Ingreso Personal:**
     - 💼 *Sueldo / Salario mensual*
     - 💻 *Honorarios / Freelance / Trabajos extra*
     - 📈 *Rendimientos de Inversión / Dividendos*
     - 🎁 *Aguinaldos / Bonos / Regalos*
     - ↩️ *Reembolsos*
   - Historial de transacciones con buscador en vivo, filtro por mes/año, tipo y categoría.

3. **Presupuestos Mensuales con Alertas Visuales:**
   - Asignación de tope de gasto mensual por categoría (ej. Alimentación: $200.000 / mes, Ocio: $60.000 / mes).
   - Barra de ejecución presupuestaria con semáforo de advertencia:
     - 🟢 **Bajo control:** $\le 75\%$ consumido.
     - 🟡 **Alerta preventiva:** $> 75\%$ y $\le 100\%$ consumido.
     - 🔴 **Excedido (Sobregiro):** $> 100\%$ del límite rebasado.

4. **Metas de Ahorro:**
   - Creación de metas con monto objetivo y fecha límite (ej. "Fondo de Emergencia", "Vacaciones", "Cambio de Coche").
   - Aportes y barra de progreso porcentual acumulado.

5. **Dashboard Financiero Personal:**
   - Tarjetas KPI: Patrimonio Neto, Ingresos del Mes, Gastos del Mes, Balance Neto (Ahorro/Déficit) y Tasa de Ahorro (`(Ingresos - Gastos) / Ingresos * 100`).
   - Gráfico de distribución de gastos por categoría.
   - Resumen de presupuestos en alerta y últimas transacciones registradas.

6. **Persistencia Híbrida y Base de Datos Real:**
   - Modo Offline/Local transparente (`localStorage` + `mockData.js`).
   - Adaptador para conectar a base de datos real remota (**Supabase PostgreSQL**) ingresando URL y Anon Key en Configuración.
   - Respaldo y restauración total en formato JSON descargable.

7. **PWA (Progressive Web App):**
   - Instalable en la pantalla de inicio de smartphones (Android / iOS) y tablets.
   - Service Worker (`sw.js`) y `manifest.json`.
   - Compatible para despliegue en GitHub Pages, Vercel, Netlify o contenedor Docker.

### Lo que NO incluye el MVP (Out-of-Scope):
- Módulos de inventario comercial, catálogo de productos para venta o insumos de fábrica.
- Conexión bancaria automática por Open Banking (requiere credenciales API institucionales de pago).
- Facturación comercial de venta o cálculo de IVA empresarial.

---

## 3. Estructura de Directorios

```
d:\Carpetas\Desarrollos\Desarrollos WEB\Contabilidad Personal\
├── index.html                     # Shell principal SPA (Dashboard, Cuentas, Movimientos, Presupuestos, Metas, Config)
├── manifest.json                  # Manifiesto PWA para instalación móvil
├── sw.js                          # Service Worker para caché offline
├── schema.sql                     # Script PostgreSQL para Supabase
├── Dockerfile                     # Imagen Nginx para contenedor Docker
├── SPEC.md                        # Documento de Contexto y Arquitectura (este archivo)
├── AGENTS.md                      # Instrucciones operativas
├── memory.md                      # Memoria persistente de decisiones y cambios
├── PROMPT_ANTIGRAVITY_FASE_1.md    # Prompt de inicialización
├── assets/
│   ├── css/
│   │   └── styles.css             # Estilos de interfaz, animaciones y barras de progreso
│   └── js/
│       ├── app.js                 # Coordinador principal, router y renderizado SPA
│       ├── mockData.js            # Datos iniciales realistas de finanzas personales
│       ├── storage.js             # Persistencia local y utilidades de backup JSON
│       └── dbAdapter.js           # Adaptador de sincronización con Supabase PostgreSQL
```

---

## 4. Modelos de Datos (Tipos Base)

```typescript
// 1. Cuenta Personal
interface Account {
  id: string;               // Ej. "ACC-001"
  name: string;             // Ej. "Banco Estado Cuenta RUT", "Billetera Efectivo"
  type: 'cash' | 'bank' | 'credit_card' | 'wallet' | 'savings';
  initialBalance: number;   // Saldo inicial
  currentBalance: number;   // Saldo actual calculado
  currency: string;         // Ej. "CLP", "ARS", "USD"
  color: string;            // Color identificador visual
  icon: string;             // Nombre de icono Lucide
  isExcludedFromTotal: boolean; // Si es deuda excluida del activo
}

// 2. Transacción de Finanzas Personales
interface Transaction {
  id: string;               // Ej. "TX-2026-001"
  date: string;             // ISO 8601
  type: 'income' | 'expense' | 'transfer';
  accountId: string;        // Cuenta origen
  toAccountId?: string;     // Cuenta destino (solo transferencias)
  category: string;         // Ej. "Alimentación", "Vivienda", "Salario"
  amount: number;           // Monto positivo
  description: string;      // Detalle del gasto/ingreso
  paymentMethod: 'cash' | 'debit' | 'credit' | 'transfer';
  isRecurring?: boolean;
}

// 3. Presupuesto Mensual
interface Budget {
  id: string;               // Ej. "BUD-001"
  category: string;         // Categoría presupuestada
  limitAmount: number;      // Límite mensual de gasto
  spentAmount: number;      // Gasto acumulado en el mes
  month: string;            // "YYYY-MM"
}

// 4. Meta de Ahorro
interface SavingsGoal {
  id: string;               // Ej. "GOAL-001"
  title: string;            // Ej. "Fondo de Emergencia"
  targetAmount: number;     // Meta en dinero
  currentAmount: number;    // Ahorro actual
  deadlineDate?: string;    // Fecha límite
  color: string;
}
```

---

## 5. Reglas de Negocio Contable

1. **Ajuste Automático de Saldos:**
   - Registrar `income`: aumenta `currentBalance` de la cuenta asociada.
   - Registrar `expense`: disminuye `currentBalance` de la cuenta asociada.
   - Registrar `transfer`: disminuye cuenta origen y aumenta cuenta destino.
2. **Cálculo de Patrimonio Neto:**
   - Suma de saldos de cuentas de activo (Efectivo, Bancos, Billeteras, Ahorros) menos saldo de pasivos (Tarjetas de Crédito).
3. **Control Presupuestario:**
   - El gasto acumulado se calcula sumando las transacciones de tipo `expense` de la categoría en el mes seleccionado.
4. **Resiliencia Offline:**
   - Opera fluidamente con almacenamiento local y permite conectar Supabase cuando el usuario lo configure.
