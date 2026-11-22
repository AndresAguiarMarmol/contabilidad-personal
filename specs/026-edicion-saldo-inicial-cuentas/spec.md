# Especificación Funcional — Spec 026: Edición de Saldo Inicial en Cuentas Financieras

**Estado:** Aprobada  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Contexto y Justificación

Actualmente, las cuentas financieras (cuentas bancarias, efectivo, billeteras digitales, cuentas de ahorro y tarjetas de crédito) solo permiten definir su "Saldo Inicial" (capital con el que inicia la cuenta) en el momento de su creación. 

Cuando el usuario ya ha creado una cuenta con saldo inicial $0 o requiere corregir el monto de capital con el que comenzó (por ejemplo, al configurar una cuenta de ahorros patrimonial o enmendar un error de digitación), el formulario de edición de la cuenta no ofrece el campo "Saldo Inicial". Esto obliga al usuario a tener que eliminar la cuenta y volver a crearla, o bien registrar un movimiento artificial que distorsiona los reportes contables del período.

Esta especificación formaliza la capacidad de visualizar y modificar el saldo inicial en cualquier cuenta financiera existente, recalculando de manera inmediata y consistente el saldo actual de la cuenta a partir de su nuevo saldo inicial y del historial de movimientos ya registrados.

---

## 2. Historias de Usuario

- **HU-1:** Como usuario de la aplicación, quiero ver y modificar el saldo inicial de una cuenta financiera ya existente desde su formulario de edición, para poder ajustar el capital con el que comenzó la cuenta sin tener que borrarla ni recrearla.
- **HU-2:** Como usuario con movimientos ya registrados en una cuenta, quiero que al cambiar su saldo inicial, el saldo disponible actual se actualice automáticamente sumando y restando los movimientos existentes, para mantener la coherencia y exactitud contable de mi dinero.
- **HU-3:** Como usuario de tarjeta de crédito, quiero que al editar el saldo inicial de mi tarjeta, los saldos positivos continúen representándose como deuda pendiente (saldo negativo), para mantener la coherencia con la naturaleza de pasivo de la tarjeta.

---

## 3. Requisitos Funcionales (EARS)

### RF-1: Visualización del Saldo Inicial en el Formulario de Edición
*Ubicuo:*  
El sistema debe mostrar el campo "Saldo Inicial" en el formulario de edición de cualquier cuenta financiera, precargado con el valor de saldo inicial actual de la cuenta.

### RF-2: Validación del Saldo Inicial Ingresado
*Estado:*  
Mientras el valor ingresado en el campo "Saldo Inicial" esté vacío o no corresponda a un número numéricamente válido, el sistema debe bloquear el guardado de la edición y alertar al usuario.

### RF-3: Recálculo Determinista del Saldo Actual
*Dirigido por eventos:*  
Cuando el usuario guarde la modificación del saldo inicial de una cuenta, el sistema debe actualizar el saldo inicial registrado y recalcular inmediatamente el saldo actual de la cuenta, partiendo del nuevo saldo inicial y considerando la totalidad de los ingresos, gastos y transferencias existentes asociados a dicha cuenta.

### RF-4: Tratamiento Especial para Tarjetas de Crédito
*Dirigido por eventos:*  
Cuando el usuario modifique el saldo inicial de una cuenta clasificada como "Tarjeta de Crédito" ingresando un importe positivo, el sistema debe interpretar dicho monto como deuda inicial y asignarlo como un valor negativo.

### RF-5: Persistencia y Reflejo Inmediato en la Interfaz
*Dirigido por eventos:*  
Cuando se guarde la edición del saldo inicial, el sistema debe persistir los cambios y actualizar de inmediato las tarjetas de cuentas, la pantalla de detalle de cuenta y los indicadores consolidados de patrimonio neto.

---

## 4. Requisitos No Funcionales (RNF)

- **RNF-1 (Precisión Contable):** El recálculo del balance actual debe ser exacto, sin acumulación de diferencias por redondeo o centavos.
- **RNF-2 (Inmutabilidad del Historial):** La modificación del saldo inicial de una cuenta no debe alterar, modificar ni borrar ninguna de las transacciones registradas previamente.
- **RNF-3 (Compatibilidad y Sincronización):** El nuevo saldo inicial debe preservarse en el almacenamiento local y sincronizarse transparentemente con la copia en la nube.

---

## 5. Casos Límite y Reglas de Negocio

1. **Cuenta sin transacciones:** Si la cuenta no tiene transacciones registradas, el nuevo saldo actual debe ser exactamente igual al nuevo saldo inicial.
2. **Cuenta con transacciones existentes:** Si la cuenta comenzó en 0, se le registraron movimientos por +$100.000 y luego se le define un saldo inicial de $500.000, el saldo actual resultante debe ser $600.000 de forma inmediata.
3. **Cambio de saldo inicial a cero:** Si el saldo inicial se cambia a 0, el saldo actual reflejará exclusivamente el resultado neto de los movimientos registrados.
4. **Tarjetas de crédito:** Si una tarjeta de crédito tenía deuda inicial de -$50.000 y el usuario escribe `80000`, la nueva deuda inicial será -$80.000 y el saldo actual considerará dicha deuda.

---

## 6. Criterios de Aceptación (Checklist)

- [ ] El campo "Saldo Inicial" aparece visible en el modal de edición de cuentas con su valor previo precargado.
- [ ] Permite ingresar valores positivos, negativos o cero.
- [ ] Bloquea valores no numéricos.
- [ ] Al guardar, el saldo actual de la cuenta se recalcula correctamente sumando el nuevo saldo inicial y el neto de los movimientos existentes.
- [ ] En tarjetas de crédito, un saldo positivo se transforma en deuda negativa.
- [ ] Se actualizan de inmediato los paneles y tarjetas de la interfaz y se persiste el cambio.
