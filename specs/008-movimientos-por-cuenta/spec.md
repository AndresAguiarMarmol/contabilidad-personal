# Spec 008 — Visualización de Movimientos por Cuenta Seleccionada

Estado: implementada

## 1. Contexto y Objetivo
En la vista de **Cuentas & Billeteras**, los usuarios pueden ver el saldo actual de sus cuentas bancarias, billeteras, efectivo y tarjetas. Sin embargo, no pueden inspeccionar de forma inmediata el historial de movimientos de una cuenta específica sin salir de la vista o configurar manualmente filtros en otra pantalla.

El objetivo de esta especificación es permitir que, **al hacer clic o seleccionar cualquier tarjeta de cuenta** dentro de "Cuentas & Billeteras", la interfaz muestre de forma reactiva los movimientos asociados a dicha cuenta (ingresos, gastos, transferencias recibidas/enviadas y partidas split), resaltando visualmente la cuenta activa y ofreciendo métricas rápidas de la cuenta y un botón para deseleccionar o volver al listado general.

---

## 2. Usuarios e Historias de Usuario
- **HU-1:** Como usuario, quiero hacer clic en una tarjeta de cuenta en "Cuentas & Billeteras" para ver inmediatamente en la misma pantalla todos los movimientos que la afectan.
- **HU-2:** Como usuario, quiero ver un resumen rápido de la cuenta seleccionada (saldo actual, total de ingresos, total de gastos y cantidad de movimientos registrados).
- **HU-3:** Como usuario, quiero que se reconozcan tanto las transacciones directas (origen y destino de transferencia) como aquellas donde la cuenta fue asignada en una partida de un movimiento dividido (split).
- **HU-4:** Como usuario, quiero poder deseleccionar la cuenta activa fácilmente mediante un botón de cierre o volviendo a hacer clic en ella, para restablecer la vista normal de cuentas.
- **HU-5:** Como usuario, si una cuenta aún no registra movimientos, quiero ver un estado vacío amigable con opción de registrar un movimiento inmediato para esa cuenta.

---

## 3. Requisitos Funcionales (EARS)

- **RF-1 (Interacción / Evento):** CUANDO el usuario hace clic en una tarjeta de cuenta en la cuadrícula de cuentas, EL SISTEMA marca visualmente la tarjeta como seleccionada (borde destacado, anillo de foco o badge indicador) y despliega el panel de movimientos de dicha cuenta.
- **RF-2 (Comportamiento continuo):** MIENTRAS una cuenta esté seleccionada, EL SISTEMA muestra un panel de detalle con:
  1. Nombre, tipo, icono y color identificador de la cuenta.
  2. Saldo actual formateado en moneda personal.
  3. Resumen financiero acumulado de la cuenta (Total Ingresos/Abonos, Total Gastos/Cargos y Número de movimientos).
  4. Tabla o lista de movimientos ordenados cronológicamente (más recientes primero).
- **RF-3 (Comportamiento condicional):** SI el movimiento es de tipo dividido (split) y afecta a la cuenta seleccionada (ya sea como cuenta pagadora o receptora en alguna de sus partidas), EL SISTEMA muestra el desglose correspondiente indicando la partida que afectó a la cuenta.
- **RF-4 (Comportamiento condicional):** SI la cuenta seleccionada no posee transacciones asociadas, EL SISTEMA muestra un mensaje informativo de estado vacío indicando que no hay movimientos registrados para esa cuenta y un botón directo para registrar un movimiento.
- **RF-5 (Interacción / Evento):** CUANDO el usuario hace clic en el botón de cerrar selección (o vuelve a presionar la tarjeta activa), EL SISTEMA oculta el panel de movimientos y deselecciona la cuenta.
- **RF-6 (Lógica desacoplada):** EL SISTEMA calcula las transacciones asociadas a una cuenta y su resumen de balance mediante la función pura `obtenerMovimientosDeCuenta(transactions, accountId)`.

---

## 4. Requisitos No Funcionales
- **RNF-1:** Compatibilidad universal sin dependencias externas ni compiladores; renderizado reactivo en navegador (compatible con `file:///` y HTTP).
- **RNF-2:** Lógica pura desacoplada con 100% de pruebas unitarias ejecutadas mediante `node --test`.
- **RNF-3:** Accesibilidad y ergonomía: navegación por teclado y contraste adecuado en modo claro y modo oscuro.

---

## 5. Casos Límite y Manejo de Errores
- Cuenta inexistente o id inválido: No arroja excepciones, mantiene el estado seguro y no muestra movimientos.
- Cuenta con transferencias: Si la cuenta es origen, se muestra como egreso/débito (`-`); si es destino (`toAccountId`), se muestra como abono/crédito (`+`).
- Cuenta de tarjeta de crédito con saldo negativo: Se muestra el saldo adeudado con el color semántico apropiado.

---

## 6. Criterios de Finalización (DoD)
- [x] Función pura `obtenerMovimientosDeCuenta(transactions, accountId)` con pruebas unitarias en `node --test`.
- [x] Función pura `calcularResumenCuenta(transactions, accountId)` con pruebas unitarias en `node --test`.
- [x] Tarjetas de cuenta interactivas (cursor pointer, efectos hover y estado activo visual al seleccionarse).
- [x] Panel reactivo de movimientos asociados renderizado en `view-accounts`.
- [x] Estado vacío amigable cuando la cuenta seleccionada no tiene movimientos.
- [x] Botón para cerrar o deseleccionar la cuenta.
- [x] Verificación en vivo en navegador con Chrome DevTools con 0 errores de consola.
