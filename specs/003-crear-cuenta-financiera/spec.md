# Spec 003 — Planilla y Creación de Nuevas Cuentas Financieras

Estado: implementada

## 1. Contexto y Objetivo
Actualmente la opción "Nueva Cuenta" despliega un mensaje provisional. Para que el usuario pueda reflejar con fidelidad toda su estructura patrimonial, se requiere una planilla interactiva que permita dar de alta nuevas cuentas bancarias, billeteras de efectivo, billeteras digitales, cuentas de inversión o tarjetas de crédito, asignando un saldo inicial y atributos visuales identificadores.

## 2. Usuarios y Roles
- **Usuario de Finanzas Personales:** Necesita registrar una nueva cuenta bancaria, tarjeta o billetera virtual para que aparezca disponible en el catálogo de cuentas y en los selectores de movimientos.

## 3. Historias de Usuario
- **HU-1:** Como usuario, quiero registrar una nueva cuenta financiera indicando su nombre, tipo y saldo inicial para llevar el control de mis fondos disponibles.
- **HU-2:** Como usuario, quiero asignar un color representativo y tipo de cuenta para distinguirla visualmente en las tarjetas de saldos y gráficos.
- **HU-3:** Como usuario, quiero registrar una tarjeta de crédito especificando su saldo adeudado inicial para que se compute correctamente dentro del pasivo en mi patrimonio neto.

## 4. Definiciones y Glosario
- **Cuenta Financiera:** Entidad donde reside dinero disponible (activo) o se registra deuda (pasivo).
- **Tipos de Cuenta:**
  - *Cuenta Bancaria:* Cuenta corriente, cuenta vista o caja de ahorro bancaria.
  - *Efectivo:* Dinero físico en billetera o caja de seguridad.
  - *Billetera Digital:* Cuentas virtuales prepago o de transferencias rápidas.
  - *Ahorro / Inversión:* Fondos mutuos, depósitos a plazo o cuentas de ahorro.
  - *Tarjeta de Crédito:* Instrumento de pago que genera pasivo/deuda.

## 5. Requisitos Funcionales (EARS)
- **RF-1 (Evento):** CUANDO el usuario pulsa sobre "Nueva Cuenta" en la sección de Cuentas & Billeteras, EL SISTEMA despliega la planilla de registro con los campos de nombre, tipo, saldo inicial, moneda, color y opción de exclusión.
- **RF-2 (Estado no deseado):** SI el usuario intenta guardar una cuenta con nombre vacío o con un nombre ya existente en el sistema, ENTONCES EL SISTEMA bloquea la creación y alerta al usuario con un mensaje explicativo.
- **RF-3 (Basado en estado):** MIENTRAS el tipo seleccionado sea "Tarjeta de Crédito", EL SISTEMA permite ingresar el saldo adeudado inicial y lo registra contablemente como pasivo (saldo negativo en la cuenta).
- **RF-4 (Evento):** CUANDO el usuario confirma una cuenta válida, EL SISTEMA crea la cuenta, actualiza inmediatamente el listado visual de cuentas y recalcula el Patrimonio Neto consolidado en el Dashboard.
- **RF-5 (Comportamiento continuo):** EL SISTEMA incorpora de inmediato la nueva cuenta en los selectores de cuenta de origen y destino de la planilla de Nuevos Movimientos.

## 6. Requisitos No Funcionales
- **RNF-1:** Accesibilidad total con teclado (Escape para cancelar, Enter para confirmar).
- **RNF-2:** Notificación visual inmediata tipo Toast confirmando la creación exitosa.
- **RNF-3:** Persistencia local y en base de datos remota sin requerir recargar el navegador.

## 7. Casos Límite y Manejo de Errores
- Saldo inicial en cero: Es válido (ej. una cuenta bancaria recién abierta con saldo $0).
- Nombre de cuenta con espacios innecesarios al inicio o final: El sistema debe limpiarlos automáticamente.
- Cancelación con tecla Escape: Cierra el diálogo sin alterar la lista de cuentas.

## 8. Fuera de Alcance
- Conexión por credenciales bancarias en línea (scraping / Open Banking).
- Definición de tasas de interés mensuales o cupo crediticio en cuotas.

## 9. Criterios de Finalización (DoD)
- [ ] La planilla modal de Nueva Cuenta se abre al pulsar "+ Nueva Cuenta" en la vista de Cuentas & Billeteras.
- [ ] Permite seleccionar tipo (Banco, Efectivo, Billetera Digital, Ahorro, Tarjeta de Crédito) con asignación automática de icono y color.
- [ ] Las validaciones de nombre no vacío y nombre no duplicado están cubiertas con pruebas unitarias en `node --test`.
- [ ] La nueva cuenta se renderiza en la cuadrícula de cuentas con su saldo inicial y badge de tipo.
- [ ] El Dashboard actualiza en tiempo real el patrimonio neto y el resumen de activos/deudas.
- [ ] La nueva cuenta aparece disponible en la planilla de "+ Nuevo Movimiento".
