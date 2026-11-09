# PROMPT_ANTIGRAVITY_FASE_1.md — Prompt de Ejecución para Agente Autónomo

> **Instrucciones:** Copia este prompt directamente para levantar el Shell Visual de la **App de Contabilidad Personal (PWA)** sin inventario comercial.

---

### Rol y Contexto Asignado
Actúa como un **Lead Frontend Engineer & UI Specialist en Finanzas Personales**.
Tu objetivo en esta fase es levantar la estructura base, los componentes visuales, la navegación SPA y los datos mock para la nueva:
**"App de Contabilidad Personal y Gestión Patrimonial (PWA)"**.

Debes seguir estrictamente las especificaciones de `SPEC.md` y respetar las reglas de `AGENTS.md`. No utilices bundlers complejos (Webpack, Vite); utiliza Vanilla JavaScript modular (ES6), Tailwind CSS (vía CDN), Lucide Icons y prepara los manifiestos PWA para instalación móvil.

> [!IMPORTANT]
> **Sin inventario ni catálogo:** Esta aplicación está orientada 100% a las **finanzas personales y familiares**. No incluye módulos de inventario, stock, catálogo de productos ni pedidos a proveedores.

---

### Tarea de Ejecución Inmediata: Levantamiento del Shell Visual

1. **Estructura de Archivos a Crear:**
   - `index.html`: Shell principal con Tailwind CSS CDN, Lucide Icons, diseño responsivo móvil/tablet/desktop, Sidebar lateral y navegación SPA.
   - `manifest.json`: Manifiesto PWA para instalación en Android, iOS y tablets (nombre "Contabilidad Personal", tema `#0f172a`, display standalone).
   - `sw.js`: Service Worker para soporte offline y caché de recursos.
   - `assets/css/styles.css`: Estilos visuales complementarios, números tabulares, barras de presupuesto y micro-interacciones.
   - `assets/js/mockData.js`: Datos semilla de finanzas personales realistas:
     - 4 Cuentas personales (Banco Principal, Billetera Efectivo, Tarjeta de Crédito, Cuenta Ahorros).
     - 10 Transacciones recientes con categorías familiares y personales (Alimentación/Supermercado, Sueldo mensual, Alquiler/Vivienda, Servicios, Transporte, Ocio, Suscripciones).
     - 4 Presupuestos mensuales por categoría con semáforos de porcentaje consumido (uno bajo control al 50%, uno de advertencia al 82%, uno excedido al 108%).
     - 2 Metas de Ahorro con barras de progreso (Fondo de Emergencia, Vacaciones).
   - `assets/js/storage.js`: Capa de persistencia en `localStorage` con soporte de exportación/importación de backup JSON y botón de restablecimiento de datos demo.
   - `assets/js/dbAdapter.js`: Adaptador preparado para conectar con Supabase (PostgreSQL en la nube) mediante credenciales configurables, operando en modo local mientras no se configuren claves remotas.
   - `assets/js/app.js`: Coordinador principal con:
     - Enrutador de 5 vistas:
       1. **Dashboard:** Patrimonio Neto consolidado, Ingresos vs Gastos del mes, Tasa de Ahorro %, Gráfico visual de gastos por categoría, Alertas de presupuesto.
       2. **Cuentas & Billeteras:** Tarjetas de cuentas con saldo actual, desglose por tipo y botón "+ Nueva Cuenta".
       3. **Transacciones:** Tabla/lista de movimientos con filtros (tipo, categoría, fecha, cuenta) y botón "+ Registrar Movimiento".
       4. **Presupuestos & Metas:** Barras de progreso de presupuestos por categoría con semáforo (Verde, Amarillo, Rojo) y tarjetas de metas de ahorro.
       5. **Configuración & Base de Datos:** Panel de conexión a base de datos real (Supabase URL / Anon Key), descarga de script `schema.sql`, exportación de backup y alternancia de tema.
     - Toggle de Modo Claro / Modo Oscuro con persistencia.
     - Notificaciones flotantes (*Toasts*).

2. **Criterios de Aceptación ("Definition of Done"):**
   - [ ] `index.html` carga de forma limpia, sin errores de consola.
   - [ ] La navegación entre las 5 vistas (Dashboard, Cuentas, Transacciones, Presupuestos/Metas, Configuración) funciona instantáneamente.
   - [ ] El Dashboard calcula y muestra el Patrimonio Neto consolidado, Ingresos/Gastos del mes y la Tasa de Ahorro a partir de los datos mock de finanzas personales.
   - [ ] La sección de Presupuestos muestra las barras de porcentaje consumido con sus colores de advertencia (Verde $\le 75\%$, Amarillo $> 75\%$, Rojo $> 100\%$).
   - [ ] No existen referencias a inventario, stock comercial ni catálogo de venta.
   - [ ] Modo Claro y Oscuro funcional.
