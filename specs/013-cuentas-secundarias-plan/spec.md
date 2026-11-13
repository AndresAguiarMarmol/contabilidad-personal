# Spec 013 — Creación de Cuentas Secundarias a Cuentas Base en el Plan de Cuentas

Estado: implementada

## 1. Contexto y Objetivo
En el **Plan de Cuentas Contable Personal** (Spec 011 y 012), el sistema provee un catálogo maestro de **Cuentas Base** predefinidas con codificación estándar de 3 segmentos (ej. `1.1.01`, `1.1.02`, `1.3.03`, `2.1.01`, `4.1.01`, `5.1.01`, `5.2.01`).

Para una gestión contable verdaderamente adaptada a la realidad cotidiana del usuario o grupo familiar, se requiere granularidad analítica: poder desglosar una **Cuenta Base** en **Cuentas Secundarias (Subcuentas)**:
- Por ejemplo, bajo la Cuenta Base `5.1.01 Vivienda & Servicios`:
  - `5.1.01.01` Alquiler o Dividendo
  - `5.1.01.02` Gastos Comunes del Edificio
  - `5.1.01.03` Electricidad y Luz
  - `5.1.01.04` Agua Potable
  - `5.1.01.05` Internet, Telefonía y Streaming
- Bajo la Cuenta Base `5.2.01 Alimentación & Supermercado`:
  - `5.2.01.01` Supermercado Mensual / Despensa
  - `5.2.01.02` Feria, Frutas y Verduras
  - `5.2.01.03` Panadería y Cafetería Diaria
- Bajo la Cuenta Base `4.1.01 Sueldo y Salario`:
  - `4.1.01.01` Sueldo Empleador Principal
  - `4.1.01.02` Ingresos Secundarios / Part-time
- Bajo la Cuenta Base `1.3.03 Tecnología, Computación y Equipamiento`:
  - `1.3.03.01` Notebooks y Computadores
  - `1.3.03.02` Celulares y Tablets

El objetivo de esta especificación es:
1. Permitir la creación y gestión (CRUD) de **Cuentas Secundarias (Subcuentas)** dependientes de cualquier Cuenta Base del Plan de Cuentas.
2. Calcular y sugerir automáticamente el código contable secundario correlativo (ej. `5.1.01.01`, `5.1.01.02`).
3. Heredar automáticamente la clase contable, el grupo y la naturaleza contable de la cuenta base padre.
4. Visualizar las subcuentas jerárquicamente indentadas bajo su cuenta base en la tabla del Plan de Cuentas.
5. Permitir la creación rápida de subcuentas mediante un botón de acción dedicado `+ Subcuenta` directamente en la fila de cada cuenta base.
6. Integrar de inmediato las subcuentas secundarias en el selector de categorías de nuevos movimientos, split y presupuestos.

---

## 2. Usuarios e Historias de Usuario
- **HU-1:** Como usuario, quiero poder crear una subcuenta o cuenta secundaria seleccionando una Cuenta Base existente para organizar en detalle mis partidas de gastos, ingresos o activos.
- **HU-2:** Como usuario, en la tabla del Plan de Cuentas, quiero un botón rápido `+ Subcuenta` en la fila de cada cuenta base para crear directamente una hija sin tener que buscar o recordar su código.
- **HU-3:** Como usuario, quiero que el sistema me sugiera automáticamente el código correlativo de la subcuenta (ej. si la base es `5.2.01`, que sugiera `5.2.01.01`, luego `5.2.01.02`) para evitar errores y mantener la jerarquía contable limpia.
- **HU-4:** Como usuario, en el Plan de Cuentas, quiero ver las cuentas secundarias visualmente indentadas debajo de su cuenta padre con una etiqueta clara que indique que es una subcuenta.
- **HU-5:** Como usuario, al registrar un gasto o ingreso, quiero poder seleccionar tanto la cuenta base como sus cuentas secundarias específicas para clasificar mis movimientos con la precisión que desee.

---

## 3. Requisitos Funcionales (EARS)

- **RF-1 (Comportamiento continuo / Detección y correlativo de subcuenta):** MIENTRAS el usuario crea una cuenta secundaria para una cuenta base padre con código `P`, EL SISTEMA calcula y sugiere el siguiente código secundario disponible mediante la función pura `generarSiguienteCodigoSubcuenta(parentCode, catalogoExistente)` en formato `P.XX` (ej. `5.1.01.01`).
- **RF-2 (Herencia de propiedades contables):** CUANDO se selecciona una cuenta base padre, EL SISTEMA asigna automáticamente la misma clase contable (`classNumber`, `classType`), el mismo rubro (`groupName`) y la misma naturaleza contable (`nature`) de la cuenta padre.
- **RF-3 (Acceso rápido desde tabla):** CUANDO el usuario hace clic en el botón `+ Subcuenta` de una cuenta base en la tabla del Plan de Cuentas, EL SISTEMA abre la planilla modal con la cuenta base preseleccionada, hereda sus atributos y precarga el código correlativo sugerido.
- **RF-4 (Validación de cuenta secundaria):** MIENTRAS se valide una subcuenta con `validarCuentaPlan()`, EL SISTEMA verifica:
  1. Que el código secundario empiece con el código de la cuenta padre (`parentCode.`).
  2. Que no existan duplicados de código en el catálogo.
  3. Que el nombre de la subcuenta no esté vacío ni duplicado dentro del mismo nivel de la cuenta padre.
- **RF-5 (Renderizado jerárquico en tabla):** MIENTRAS la vista del Plan de Cuentas esté activa, EL SISTEMA renderiza las cuentas secundarias ordenadas inmediatamente bajo su cuenta base con:
  - Sangría visual / indentación jerárquica (`pl-8` o indicador `↳`).
  - Distintivo visual `Subcuenta de [parentCode]`.
  - Icono distintivo y acciones de edición y eliminación segura.
- **RF-6 (Disponibilidad en categorías de movimientos y presupuestos):** MIENTRAS se obtengan las categorías con `obtenerCategoriasDesdePlan()`, EL SISTEMA incluye las cuentas secundarias junto a las cuentas base, permitiendo su imputación en movimientos simples, transacciones split y presupuestos.

---

## 4. Requisitos No Funcionales
- **RNF-1 (Inmutabilidad y desacoplamiento):** Toda la lógica de generación de códigos y jerarquización se implementa mediante funciones puras en `financeCalculations.js` con cobertura de pruebas en Node.js test runner.
- **RNF-2 (Compatibilidad retroactiva):** Las cuentas contables y transacciones existentes previas a la creación de subcuentas se conservan sin alteración.
- **RNF-3 (Offline-first):** Persistencia instantánea en `localStorage` (`finance_plan_accounts_data`) y exportación/importación en respaldos JSON.

---

## 5. Criterios de Finalización (DoD)
- [x] Función pura `generarSiguienteCodigoSubcuenta` implementada y testeada con `node --test`.
- [x] Función `validarCuentaPlan` adaptada para validar jerarquías de subcuentas y códigos correlativos.
- [x] Botón de acción rápida `+ Subcuenta` añadido a las filas de cuentas base en la tabla del Plan de Cuentas.
- [x] Modal de cuenta contable (`openPlanAccountModal`) con selector de cuenta base padre y cálculo automático de código.
- [x] Visualización jerárquica con sangría e identificador en la tabla del Plan de Cuentas.
- [x] Disponibilidad de subcuentas en selectores de movimientos (gastos, ingresos y split) y presupuestos.
- [x] 100% de suites de pruebas unitarias en verde (62/62 pruebas pasando).
- [x] Actualización y sincronización en GitHub (`main`).
- [x] Registro en `memory.md`.
