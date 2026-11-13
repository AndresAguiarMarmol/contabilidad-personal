# Plan Técnico — Spec 011: Plan de Cuentas Orientado a Contabilidad Personal

## 1. Arquitectura de Datos del Plan de Cuentas Personal
Cada cuenta contable dentro del Plan de Cuentas Personal responde a la siguiente interfaz de datos:

```ts
interface AccountPlanItem {
  id: string; // ej. "PLAN-1-1-01" o "ACC-001"
  code: string; // ej. "1.1.01.01" o "5.2.01"
  name: string; // ej. "Supermercado y Despensa"
  classType: "asset" | "liability" | "equity" | "income" | "expense";
  classNumber: 1 | 2 | 3 | 4 | 5; // 1: Activos, 2: Pasivos, 3: Patrimonio, 4: Ingresos, 5: Gastos
  groupName: string; // ej. "Activo Circulante", "Alimentación & Consumo"
  nature: "debit" | "credit"; // Naturaleza contable habitual
  description?: string;
  isSystem?: boolean; // Protege cuentas maestras esenciales
  financialAccountId?: string; // Enlace a cuenta financiera si aplica
}
```

## 2. Catálogo Maestro Estándar de Finanzas Personales
Se define en `financeCalculations.js` como una estructura inmutable `CATALOGO_PLAN_CUENTAS_PERSONAL_BASE`:
- **1. Activos:**
  - 1.1 Activo Circulante: Efectivo (`1.1.01`), Cuentas Bancarias (`1.1.02`), Billeteras Digitales (`1.1.03`).
  - 1.2 Ahorro e Inversiones: Fondos de Ahorro (`1.2.01`), Inversiones / Fondos Mutuos (`1.2.02`).
  - 1.3 Bienes y Activos Personales: Vivienda e Inmuebles (`1.3.01`), Vehículos (`1.3.02`), Tecnología y Computación (`1.3.03`), Mobiliario y Activos del Hogar (`1.3.04`).
- **2. Pasivos:**
  - 2.1 Pasivo Corto Plazo: Tarjetas de Crédito (`2.1.01`), Líneas de Sobregiro (`2.1.02`), Préstamos Personales (`2.1.03`).
  - 2.2 Pasivo Largo Plazo: Crédito Hipotecario (`2.2.01`), Crédito Automotriz / Consumo (`2.2.02`).
- **3. Patrimonio Neto:**
  - 3.1 Patrimonio Inicial: Capital y Patrimonio Inicial (`3.1.01`).
  - 3.2 Resultados y Ahorro: Ahorro Acumulado Ejercicios Anteriores (`3.2.01`), Resultado del Ejercicio en Curso (`3.2.02`).
- **4. Ingresos:**
  - 4.1 Ingresos Laborales: Sueldo y Salario (`4.1.01`), Honorarios Freelance (`4.1.02`), Bonos y Gratificaciones (`4.1.03`).
  - 4.2 Rendimientos de Capital: Intereses Bancarios (`4.2.01`), Rendimiento Inversiones (`4.2.02`), Rentas Cobradas (`4.2.03`).
  - 4.3 Otros Ingresos: Devoluciones y Reembolsos (`4.3.01`), Premios y Regalos (`4.3.02`).
- **5. Gastos:**
  - 5.1 Vivienda y Servicios: Alquiler / Gastos Comunes (`5.1.01`), Servicios Básicos (`5.1.02`), Internet y Telefonía (`5.1.03`), Mantenimiento del Hogar (`5.1.04`).
  - 5.2 Alimentación: Supermercado (`5.2.01`), Panadería y Ferias (`5.2.02`), Restaurantes y Cafés (`5.2.03`), Delivery (`5.2.04`).
  - 5.3 Transporte: Combustible (`5.3.01`), Transporte Público (`5.3.02`), Apps de Movilidad (`5.3.03`), Mantenimiento y TAG (`5.3.04`).
  - 5.4 Salud y Bienestar: Seguro de Salud (`5.4.01`), Farmacia (`5.4.02`), Consultas Médicas (`5.4.03`), Gimnasio y Deporte (`5.4.04`).
  - 5.5 Educación: Cursos y Capacitación (`5.5.01`), Libros (`5.5.02`), Matrículas (`5.5.03`).
  - 5.6 Ocio y Estilo de Vida: Suscripciones y Streaming (`5.6.01`), Vacaciones (`5.6.02`), Vestuario (`5.6.03`), Recreación (`5.6.04`).
  - 5.7 Gastos Financieros: Comisiones Bancarias (`5.7.01`), Intereses de Tarjetas (`5.7.02`), Imprevistos (`5.7.03`).

## 3. Funciones Puras en `financeCalculations.js`
1. `obtenerCatalogoPlanCuentas(cuentasPersonalizadas, cuentasFinancieras, transacciones)`: Consolida el catálogo maestro con cuentas financieras activas y calcula saldos contables y montos del período acumulados.
2. `calcularResumenPlanCuentas(catalogoConsolidado, transacciones)`: Computa total Activos, total Pasivos, Patrimonio Neto, total Ingresos, total Gastos y Resultado Operativo.
3. `validarCuentaPlan(cuentaData, catalogoExistente, idActual)`: Valida código único, formato, nombre y asignación correcta de clase (1 a 5).
4. `puedeEliminarCuentaPlan(cuentaId, transacciones, cuentasFinancieras)`: Verifica si existen transacciones o dependencias antes de permitir el borrado.

## 4. Renderizado e Interfaz de Usuario
- Actualización de `renderChartOfAccounts()` en `app.js` para renderizar el plan completo con selector de pestañas (Todos, 1. Activos, 2. Pasivos, 3. Patrimonio, 4. Ingresos, 5. Gastos).
- Modal `openPlanAccountModal(idToEdit)` para crear o editar cuentas del catálogo contable personal.
- Modal de confirmación para eliminación con verificación de integridad.
- Enlace reactivo del botón del menú vertical `[data-nav-view="chart-of-accounts"]`.

## 5. Pruebas Unitarias TDD
- `tests/personal-chart-of-accounts.test.js` probando:
  - Generación y estructura del catálogo personal maestro.
  - Cálculo de saldos y resumen patrimonial por clases contables.
  - Validación de alta y edición de cuentas contables.
  - Bloqueo o advertencia de eliminación de cuentas con movimientos.
