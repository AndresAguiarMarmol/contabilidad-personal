# Spec 004 — Movimientos Divididos (Split Transactions)

Estado: implementada

## 1. Contexto y Objetivo
En la gestión financiera cotidiana, una sola transacción global de pago o cobro a menudo involucra múltiples partidas, categorías o transferencias a diferentes cuentas de activos. Por ejemplo, al realizar un pago total de $1.000.000 con tarjeta de crédito para adquirir electrodomésticos y tecnología, el usuario necesita desglosarlo en:
- Una partida de $80.000 (ej. aspiradora para la cuenta de activos del hogar).
- Una partida de $920.000 (ej. televisor para la cuenta de electrónica y computación).

El objetivo es incorporar la funcionalidad de **Movimiento Dividido (Split)** en la planilla de Nuevo Movimiento, permitiendo desglosar una operación en dos o más líneas que afecten a diferentes cuentas de destino o categorías, garantizando la cuadratura contable estricta ($\sum \text{líneas} = \text{monto total}$).

## 2. Usuarios y Roles
- **Usuario de Finanzas Personales:** Necesita registrar compras complejas o tickets compartidos donde un solo medio de pago financia partidas que corresponden a distintas cuentas patrimoniales o categorías de gasto.

## 3. Historias de Usuario
- **HU-1:** Como usuario, quiero activar la opción de "Movimiento Dividido (Split)" al registrar un movimiento para desglosar el total en múltiples líneas con sus propios conceptos, montos y cuentas/categorías.
- **HU-2:** Como usuario, quiero que el sistema me informe en tiempo real si la suma de las líneas cuadra con el monto total o si existe una diferencia pendiente de asignar.
- **HU-3:** Como usuario, quiero que al confirmar un movimiento dividido, la cuenta de pago se debite por el total y cada cuenta de destino o categoría reciba con exactitud su monto respectivo.

## 4. Definiciones y Glosario
- **Movimiento Split (Dividido):** Transacción compuesta por una cabecera (monto total, fecha, cuenta pagadora/receptora) y una colección de dos o más líneas hijas o partidas.
- **Partida / Línea Split:** Componente individual del desglose con su descripción, monto y cuenta de destino o categoría asignada.
- **Cuadratura Contable:** Principio por el cual la suma de los montos de todas las líneas split debe ser matemáticamente igual al monto total de la operación ($\text{Diferencia} = 0$).

## 5. Requisitos Funcionales (EARS)
- **RF-1 (Evento):** CUANDO el usuario activa la opción "Dividir movimiento (Split)" en la planilla de Nuevo Movimiento, EL SISTEMA despliega una sección dinámica de desglose de líneas con al menos dos líneas iniciales y un botón para añadir más líneas.
- **RF-2 (Comportamiento continuo):** EL SISTEMA calcula y muestra en tiempo real la suma acumulada de las líneas y la diferencia pendiente respecto al monto total especificado.
- **RF-3 (Estado no deseado):** SI la suma de los montos de las líneas no coincide exactamente con el monto total de la transacción o si alguna línea tiene monto menor o igual a cero, ENTONCES EL SISTEMA bloquea el guardado y destaca la diferencia numérica pendiente.
- **RF-4 (Evento):** CUANDO el usuario confirma un movimiento dividido válido de pago (Gasto / Transferencia patrimonial múltiple), EL SISTEMA debita el monto total de la cuenta pagadora e incrementa o afecta atómicamente cada una de las cuentas o categorías receptoras de cada línea.
- **RF-5 (Comportamiento continuo):** EL SISTEMA registra el movimiento en el historial identificándolo visualmente con una etiqueta "Split (N líneas)" y permitiendo visualizar el desglose detallado de cada partida.

## 6. Requisitos No Funcionales
- **RNF-1:** Cálculo reactivo de la cuadratura sin retardo perceptible al escribir montos.
- **RNF-2:** Facilidad de añadir o eliminar líneas split de forma fluida (mínimo 2 líneas).
- **RNF-3:** Inmutabilidad contable y persistencia completa de las líneas split en el almacenamiento local y remoto.

## 7. Casos Límite y Manejo de Errores
- Línea split con cuenta de destino igual a la cuenta de origen: El sistema debe impedir seleccionar la misma cuenta de pago como destino en la misma línea.
- Eliminación de líneas cuando solo quedan dos: El botón de eliminar se desactiva para mantener el mínimo de dos partidas en un split.
- Cierre del diálogo modal: Se descarta el borrador del split sin alterar ningún saldo contable.

## 8. Fuera de Alcance
- Desglose con divisas mixtas simultáneas en un mismo movimiento (ej. pagar en CLP y asignar líneas en USD).

## 9. Criterios de Finalización (DoD)
- [x] La planilla de Nuevo Movimiento incluye el interruptor / checkbox "Dividir movimiento (Split)".
- [x] Permite añadir y eliminar líneas dinámicamente con selectores independientes de cuenta/categoría.
- [x] Indicador en vivo de cuadratura (Monto Total vs Suma de Líneas vs Diferencia).
- [x] Lógica pura de validación y cálculo de impacto de movimientos split cubierta al 100% con pruebas unitarias en `node --test`.
- [x] Al guardar, los saldos de la cuenta pagadora y de las múltiples cuentas receptoras se actualizan con total precisión.
- [x] La transacción split aparece en la tabla de movimientos con el desglose de sus líneas.
