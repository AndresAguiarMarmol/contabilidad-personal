# Spec 002 — Planilla de Registro de Nuevos Movimientos Contables

Estado: implementada

## 1. Contexto y Objetivo
Actualmente la opción "Nuevo Movimiento" abre un mensaje informativo preliminar. Para que la aplicación sea plenamente funcional, los usuarios necesitan una planilla completa e interactiva que les permita registrar sus ingresos, gastos cotidianos y transferencias entre cuentas propias, validando los datos y actualizando los saldos y balances del sistema en tiempo real.

## 2. Usuarios y Roles
- **Usuario de Finanzas Personales:** Necesita ingresar un gasto del día (ej. compra en el supermercado), un cobro de sueldo o una transferencia de ahorro de forma rápida y sin complicaciones desde su móvil o computadora.

## 3. Historias de Usuario
- **HU-1:** Como usuario, quiero registrar un gasto seleccionando la categoría y la cuenta de pago para que mi saldo disponible y mi presupuesto se descuenten inmediatamente.
- **HU-2:** Como usuario, quiero registrar un ingreso indicando la cuenta receptora y su concepto para ver reflejado el incremento en mi patrimonio neto.
- **HU-3:** Como usuario, quiero transferir dinero entre dos cuentas propias (ej. de mi cuenta corriente a mi cuenta de ahorros) sin alterar mi patrimonio neto total pero reflejando los saldos de cada cuenta con exactitud.

## 4. Definiciones y Glosario
- **Movimiento Contable:** Cualquier operación financiera clasificada como Ingreso, Gasto o Transferencia.
- **Cuenta Origen:** Cuenta desde la cual egresa el dinero.
- **Cuenta Destino:** Cuenta que recibe los fondos (exclusiva de transferencias).
- **Semáforo de Presupuesto:** Indicador visual que mide el porcentaje de gasto consumido en la categoría seleccionada.

## 5. Requisitos Funcionales (EARS)
- **RF-1 (Evento):** CUANDO el usuario hace clic en "Nuevo Movimiento" (en la barra superior o en la vista de Movimientos), EL SISTEMA despliega la planilla de registro en pantalla con la fecha del día precargada y el tipo "Gasto" seleccionado por defecto.
- **RF-2 (Basado en estado):** MIENTRAS el tipo de movimiento seleccionado sea "Gasto" o "Ingreso", EL SISTEMA muestra las categorías correspondientes al tipo y oculta el selector de cuenta destino.
- **RF-3 (Basado en estado):** MIENTRAS el tipo de movimiento seleccionado sea "Transferencia", EL SISTEMA muestra el selector de cuenta destino y valida que sea diferente a la cuenta de origen.
- **RF-4 (Estado no deseado):** SI el usuario intenta guardar un movimiento con monto menor o igual a cero, sin descripción o sin seleccionar cuenta, ENTONCES EL SISTEMA bloquea el guardado y destaca visualmente los campos requeridos.
- **RF-5 (Evento):** CUANDO el usuario confirma un movimiento válido de tipo "Gasto", EL SISTEMA descuenta el monto del saldo de la cuenta origen, añade el movimiento al historial y actualiza el gasto del mes y el presupuesto de la categoría.
- **RF-6 (Evento):** CUANDO el usuario confirma un movimiento válido de tipo "Ingreso", EL SISTEMA incrementa el saldo de la cuenta origen en el monto indicado, añade el movimiento al historial y recalcula los ingresos y el patrimonio neto.
- **RF-7 (Evento):** CUANDO el usuario confirma un movimiento válido de tipo "Transferencia", EL SISTEMA descuenta el monto de la cuenta origen, incrementa la cuenta destino en el mismo monto y registra la transferencia en el historial.

## 6. Requisitos No Funcionales
- **RNF-1:** El formulario debe ser operable ágilmente con teclado (tabulación y tecla Enter para guardar, Escape para cancelar).
- **RNF-2:** Confirmación visual inmediata no invasiva mediante notificación flotante (Toast) al completar el registro.
- **RNF-3:** Persistencia inmediata de los cambios sin recargar la página.

## 7. Casos Límite y Manejo de Errores
- Transferencia entre la misma cuenta de origen y destino: el sistema debe impedir seleccionar la misma cuenta en ambos campos.
- Registro con montos decimales o formato con puntos: el sistema debe normalizar la entrada numérica sin romper cálculos.
- Cancelación o cierre del formulario con tecla Escape: se descartan los datos ingresados sin alterar ningún saldo.

## 8. Fuera de Alcance
- Adjuntar recibos en formato PDF o fotos escaneadas de tickets.
- División de un mismo gasto en múltiples categorías simultáneas (Split transaction).

## 9. Criterios de Finalización (DoD)
- [ ] La planilla de Nuevo Movimiento se abre al pulsar "+ Nuevo Movimiento" desde el header o la vista de Movimientos.
- [ ] Permite alternar limpiamente entre "Gasto", "Ingreso" y "Transferencia".
- [ ] Los selectores de cuentas y categorías se alimentan dinámicamente de las cuentas y categorías configuradas.
- [ ] Validaciones de montos > 0, descripción obligatoria y cuentas distintas en transferencias cubiertas con tests unitarios.
- [ ] Guardar un movimiento actualiza de inmediato el Dashboard, los saldos de las cuentas, la tabla de movimientos y los presupuestos.
- [ ] Suite de pruebas unitarias pasando al 100% en verde con `node --test`.
