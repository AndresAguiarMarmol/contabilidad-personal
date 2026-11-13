# Spec 011 — Plan de Cuentas Orientado a Contabilidad Personal y Acceso desde Botón

Estado: implementada

## 1. Contexto y Objetivo
En la gestión patrimonial y financiera personal, un verdadero **Plan de Cuentas Contable** no se reduce únicamente a las cuentas de tesorería (bancos y billeteras), sino que comprende un árbol integral estructurado en las 5 grandes clases de la contabilidad financiera adaptada a la persona o familia:
1. **Activos:** Disponible (efectivo, bancos, billeteras digitales), Ahorro e Inversiones líquidas, y Bienes/Activos Fijos Personales (vivienda, vehículos, tecnología, enseres del hogar).
2. **Pasivos:** Deudas de corto plazo (tarjetas de crédito, sobregiros) y deudas de largo plazo (hipotecas, créditos de consumo).
3. **Patrimonio Neto:** Capital inicial y ahorros o resultados acumulados.
4. **Ingresos:** Ingresos laborales (sueldos, honorarios, bonos), rendimientos de capital y otros ingresos.
5. **Gastos:** Vivienda, alimentación, transporte, salud, educación, ocio y gastos financieros.

El usuario solicita:
1. Diseñar e implementar un **Plan de Cuentas maestro completo orientado 100% a la contabilidad personal**.
2. Conectar el acceso a este Plan de Cuentas integral a través del botón **"Plan de Cuentas"** en el menú vertical de navegación.
3. Permitir operaciones completas de consulta jerárquica por clases, búsqueda reactiva, adición de cuentas/subcuentas personalizadas, edición y eliminación segura con verificación de integridad referencial.
4. Sincronizar de forma bidireccional los saldos y movimientos con las cuentas financieras y transacciones existentes.

---

## 2. Usuarios e Historias de Usuario
- **HU-1:** Como usuario, quiero acceder al Plan de Cuentas Personal pulsando el botón "Plan de Cuentas" en el menú vertical para tener una visión contable formal y unificada de todas mis finanzas.
- **HU-2:** Como usuario, quiero ver mi catálogo estructurado en las 5 clases contables (1. Activos, 2. Pasivos, 3. Patrimonio, 4. Ingresos, 5. Gastos) con códigos normalizados (ej. `1.1.01`, `2.1.01`, `4.1.01`, `5.2.01`).
- **HU-3:** Como usuario, quiero ver subtotales y métricas consolidadas por clase contable, incluyendo el total de Activos, Pasivos, Patrimonio Neto y el Resultado del Ejercicio (Ingresos vs Gastos).
- **HU-4:** Como usuario, quiero poder agregar nuevas cuentas contables dentro de cualquiera de las clases o rubros para personalizar mi estructura contable.
- **HU-5:** Como usuario, quiero poder editar el nombre, código o descripción de una cuenta del Plan de Cuentas.
- **HU-6:** Como usuario, quiero poder eliminar cuentas personalizadas que no tengan movimientos registrados, previniendo el borrado accidental de cuentas activas.
- **HU-7:** Como usuario, quiero filtrar el árbol contable por clase (Todos, Activos, Pasivos, Patrimonio, Ingresos, Gastos) y buscar en tiempo real por código o concepto.

---

## 3. Requisitos Funcionales (EARS)

- **RF-1 (Interacción / Navegación):** CUANDO el usuario hace clic en el botón "Plan de Cuentas" del menú vertical (`[data-nav-view="chart-of-accounts"]`), EL SISTEMA activa la vista `view-chart-of-accounts`, actualiza el estado de navegación activo y renderiza la pantalla del Plan de Cuentas Contable Personal.
- **RF-2 (Catálogo Semilla / Comportamiento continuo):** MIENTRAS la aplicación inicia o no existan cuentas personalizadas adicionales en almacenamiento local, EL SISTEMA provee un catálogo base preconfigurado de Plan de Cuentas Personal clasificado en:
  - Clase 1: Activos (1.1 Circulante, 1.2 Inversiones, 1.3 Bienes y Activos del Hogar/Tecnología).
  - Clase 2: Pasivos (2.1 Corto Plazo/Tarjetas, 2.2 Largo Plazo/Hipotecario/Consumo).
  - Clase 3: Patrimonio Neto (3.1 Patrimonio Inicial, 3.2 Ahorro y Resultados Acumulados).
  - Clase 4: Ingresos (4.1 Laborales, 4.2 Rendimientos de Capital, 4.3 Otros Ingresos).
  - Clase 5: Gastos (5.1 Vivienda, 5.2 Alimentación, 5.3 Transporte, 5.4 Salud, 5.5 Educación, 5.6 Ocio, 5.7 Financieros).
- **RF-3 (Comportamiento de datos / Resumen Superior):** MIENTRAS la vista "Plan de Cuentas" esté activa, EL SISTEMA muestra un tablero de métricas con:
  1. Total Activos ($).
  2. Total Pasivos ($).
  3. Patrimonio Neto ($ = Activos - Pasivos).
  4. Total Ingresos Acumulados ($).
  5. Total Gastos Acumulados ($).
  6. Resultado Operativo Neto ($ = Ingresos - Gastos).
- **RF-4 (Comportamiento de filtrado y búsqueda):** MIENTRAS el usuario escribe en el buscador o selecciona una pestaña/filtro de clase (Todos, Activos, Pasivos, Patrimonio, Ingresos, Gastos), EL SISTEMA filtra de forma instantánea y reactiva las cuentas coincidentes sin recargar la página.
- **RF-5 (Evento / Create):** CUANDO el usuario pulsa "+ Nueva Cuenta Contable", EL SISTEMA despliega una planilla modal permitiendo especificar clase/grupo contable, código, nombre, tipo/naturaleza y notas, validando que el código y nombre sean únicos.
- **RF-6 (Evento / Update):** CUANDO el usuario pulsa "Editar" en cualquier cuenta del plan, EL SISTEMA despliega el modal precargado permitiendo modificar su código, nombre y propiedades contables.
- **RF-7 (Evento / Delete):** CUANDO el usuario pulsa "Eliminar" en una cuenta:
  - SI la cuenta posee movimientos o cuentas hijas vinculadas, EL SISTEMA impide el borrado o solicita confirmación estricta con advertencia de impacto.
  - SI la cuenta no posee movimientos, EL SISTEMA la elimina del catálogo y persiste el cambio en `localStorage`.
- **RF-8 (Lógica desacoplada y determinista):** EL SISTEMA implementa el catálogo contable maestro, el cálculo de métricas del plan y la validación en funciones puras en `financeCalculations.js` con pruebas unitarias ejecutadas mediante `node --test`.

---

## 4. Requisitos No Funcionales
- **RNF-1:** Compatibilidad universal para apertura directa (`file:///`) y HTTP sin necesidad de servidor de compilación.
- **RNF-2:** Persistencia automática en `localStorage` bajo clave estructurada y sincronización con el estado global `state`.
- **RNF-3:** Diseño visual adaptado al tema claro/oscuro, tipografía monoespaciada para códigos y números tabulares para montos.

---

## 5. Criterios de Finalización (DoD)
- [x] Catálogo inicial del Plan de Cuentas para contabilidad personal definido en funciones puras.
- [x] Pruebas unitarias en `tests/personal-chart-of-accounts.test.js` pasando al 100% en `node --test`.
- [x] Botón "Plan de Cuentas" en menú vertical enlazado de forma reactiva a la vista contable.
- [x] Vista completa con selector por clases (Activos, Pasivos, Patrimonio, Ingresos, Gastos) y buscador en tiempo real.
- [x] Tablero de KPIs consolidados (Activos, Pasivos, Patrimonio Neto, Ingresos, Gastos, Resultado).
- [x] Modales CRUD interactivos para Crear, Editar y Eliminar cuentas del Plan de Cuentas.
- [x] Sincronización con `localStorage` y cuentas financieras existentes.
- [x] Verificación de 0 errores en consola y actualización de `memory.md`.
