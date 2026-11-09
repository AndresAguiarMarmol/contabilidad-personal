# Spec 009 — Pantalla Adicional de Detalle y Movimientos de Cuenta

Estado: implementada

## 1. Contexto y Objetivo
En la versión previa, al hacer clic en una tarjeta de cuenta en "Cuentas & Billeteras", los movimientos se desplegaban en un contenedor inferior dentro de la misma cuadrícula. El usuario ha solicitado explícitamente que la visualización de los movimientos asociados a una cuenta se realice **en una pantalla adicional**.

El objetivo de esta especificación es crear una pantalla/vista dedicada (`view-account-detail`) dentro de la SPA que se active al seleccionar cualquier cuenta en "Cuentas & Billeteras". Esta pantalla contará con botón de retorno rápido a la lista de cuentas, ficha de cabecera con identidad de la cuenta (icono, color, tipo, moneda), métricas financieras acumuladas (Abonos, Cargos, Saldo disponible/adeudado), buscador/filtro de movimientos propios y listado cronológico de movimientos (con soporte de partidas split y transferencias).

---

## 2. Usuarios e Historias de Usuario
- **HU-1:** Como usuario, al hacer clic en una cuenta en "Cuentas & Billeteras", quiero navegar a una pantalla adicional dedicada exclusivamente a esa cuenta para analizar su historial sin distracciones.
- **HU-2:** Como usuario, quiero un botón claro de retorno ("← Volver a Cuentas") en la pantalla adicional para regresar instantáneamente a la cuadrícula general de cuentas.
- **HU-3:** Como usuario, quiero ver en la cabecera de la pantalla adicional los datos principales de la cuenta: saldo actual, tipo, moneda e icono identificador.
- **HU-4:** Como usuario, quiero ver tarjetas KPI de la cuenta (Total Abonos, Total Cargos, Número de movimientos) y una tabla detallada con todas sus transacciones ordenadas cronológicamente.
- **HU-5:** Como usuario, quiero poder buscar o filtrar por tipo de movimiento dentro del historial exclusivo de la cuenta seleccionada.
- **HU-6:** Como usuario, quiero un botón directo para registrar un nuevo movimiento en esa cuenta desde su propia pantalla.

---

## 3. Requisitos Funcionales (EARS)

- **RF-1 (Interacción / Navegación):** CUANDO el usuario hace clic en una tarjeta de cuenta en "Cuentas & Billeteras", EL SISTEMA oculta la cuadrícula de cuentas y navega a la pantalla adicional `view-account-detail`, actualizando el título de la página y los indicadores de navegación.
- **RF-2 (Interacción / Retorno):** CUANDO el usuario hace clic en el botón "Volver a Cuentas" en la pantalla adicional, EL SISTEMA regresa a la vista de "Cuentas & Billeteras" restaurando la visualización de todas las cuentas.
- **RF-3 (Comportamiento continuo):** MIENTRAS la pantalla adicional esté activa, EL SISTEMA presenta:
  1. Barra superior de navegación con botón de retorno y botón de acción rápida "+ Registrar Movimiento".
  2. Cabecera con nombre de la cuenta, moneda, tipo y saldo contable destacado (en rojo si es saldo adeudado de tarjeta de crédito).
  3. Tres tarjetas KPI: Total Abonos/Ingresos, Total Cargos/Gastos y Conteo de Movimientos.
  4. Barra de filtros de la cuenta (búsqueda por concepto y selector de tipo: todos, gastos, ingresos, transferencias).
  5. Tabla cronológica de movimientos asociados a la cuenta.
- **RF-4 (Comportamiento condicional):** SI el movimiento es de tipo dividido (split) y afecta a la cuenta, EL SISTEMA muestra el desglose de partidas indicando la asignación a la cuenta y su impacto relativo (`+` si es partida asignada, `-` si es la cuenta pagadora global).
- **RF-5 (Comportamiento condicional):** SI la cuenta no posee movimientos registrados, EL SISTEMA muestra un estado vacío informativo con un botón para registrar el primer movimiento en la cuenta.
- **RF-6 (Lógica desacoplada):** EL SISTEMA calcula y filtra los movimientos de la cuenta mediante funciones puras desacopladas probadas con `node --test`.

---

## 4. Requisitos No Funcionales
- **RNF-1:** Navegación SPA fluida e instantánea sin recarga de página.
- **RNF-2:** Lógica pura desacoplada con 100% de pruebas unitarias en `node --test`.
- **RNF-3:** Totalmente responsivo en móvil, tablet y escritorio con soporte para modo claro y oscuro.

---

## 5. Casos Límite y Manejo de Errores
- Navegación a pantalla de cuenta con id inexistente o nulo: El sistema regresa de forma segura a `view-accounts` sin arrojar errores.
- Cuenta sin movimientos: No debe fallar el cálculo de KPIs (retorna 0 en abonos y cargos) y muestra el estado vacío.
- Tarjeta de crédito con deuda: Saldo negativo destacado en rojo y clasificado como pasivo.

---

## 6. Criterios de Finalización (DoD)
- [x] Pantalla adicional `<section id="view-account-detail">` creada en `index.html`.
- [x] Enrutador SPA y `switchView` adaptados para gestionar la vista `"account-detail"`.
- [x] Función de navegación `openAccountDetail(accountId)` y botón de retorno "← Volver a Cuentas".
- [x] Renderizado de cabecera, KPIs y tabla de movimientos en la pantalla adicional.
- [x] Filtro y buscador en vivo dentro de la pantalla adicional de la cuenta.
- [x] Verificación en vivo en navegador con 0 errores de consola.
- [x] 100% de pruebas unitarias pasando en `node --test` (44/44 pruebas en verde).
