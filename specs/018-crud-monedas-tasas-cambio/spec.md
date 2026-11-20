# Spec 018 — Gestión Multidivisa, CRUD de Monedas y Transferencias con Tasa Cambiaria Heredable

## 1. Contexto y Problema
Actualmente, la aplicación registra el campo `currency` en las cuentas bancarias (por defecto `CLP`, con opciones visuales `ARS`, `USD`, `EUR`), pero:
1. No existe una tabla configurable en Ajustes (`view-settings`) para gestionar las monedas soportadas, sus nombres, símbolos y tasas de cambio referenciales respecto al peso chileno (`CLP`).
2. No existen opciones de CRUD (Crear, Leer, Editar, Eliminar) para administrar monedas ni actualizar sus cotizaciones de manera centralizada.
3. En las transferencias entre cuentas con distinta moneda (ej. de cuenta en CLP a cuenta en USD), el sistema no realiza conversión cambiaría: transfiere el monto nominal idéntico, generando descuadres graves (ej. transferir 950.000 CLP acredita 950.000 USD).
4. El usuario requiere que al realizar un movimiento o transferencia entre cuentas de distinta moneda:
   - Se presente el monto calculado en la moneda de destino según la tasa vigente de la tabla de monedas.
   - Dicha tasa sea editable directamente en el formulario de la transacción.
   - El valor colocado de la tasa sea heredado y actualizado automáticamente en la tabla de monedas del sistema para futuras operaciones.
5. El patrimonio neto consolidado debe valorizarse en la moneda base (`CLP`), convirtiendo los saldos en moneda extranjera según las tasas vigentes.

---

## 2. Requerimientos en Formato EARS

### RF-1: Catálogo Base y Estructura de Monedas
- **El sistema debe** inicializar y persistir una tabla de monedas soportadas donde cada objeto contenga:
  - `code`: Código ISO (ej. `CLP`, `USD`, `EUR`, `ARS`).
  - `name`: Nombre descriptivo (ej. "Peso Chileno", "Dólar Estadounidense").
  - `symbol`: Símbolo visual (ej. `$`, `US$`, `€`, `AR$`).
  - `rateToCLP`: Tasa cambiaria numérica respecto a 1 CLP (ej. CLP: 1.0, USD: 950.0, EUR: 1020.0, ARS: 0.95).
  - `isBase`: Booleano indicando si es la moneda base de consolidación (`true` para `CLP`, `false` para las demás).
  - `updatedAt`: Timestamp ISO de la última actualización de tasa.

### RF-2: Panel CRUD de Monedas en Configuración
- **Cuando** el usuario acceda a la sección de Configuración (`view-settings`), **el sistema debe** presentar una tabla interactiva con todas las monedas soportadas, mostrando su código, nombre, símbolo, tasa actual respecto a CLP y última actualización.
- **Cuando** el usuario pulse "+ Nueva Moneda", **el sistema debe** abrir un modal para dar de alta una nueva moneda con código, nombre, símbolo y tasa positiva.
- **Cuando** el usuario pulse "Editar" en una moneda, **el sistema debe** permitir modificar su nombre, símbolo y tasa cambiaria (en CLP la tasa permanece fija en 1.0).
- **Cuando** el usuario pulse "Eliminar" en una moneda:
  - **Si** la moneda es la moneda base `CLP`, **el sistema debe** bloquear la eliminación e informar que la moneda base no puede ser borrada.
  - **Si** existen cuentas financieras asignadas a dicha moneda, **el sistema debe** bloquear la eliminación e informar las cuentas asociadas.
  - **En caso contrario**, **el sistema debe** solicitar confirmación y eliminar la moneda de la tabla.

### RF-3: Detección y Conversión Automática en Transferencias Multidivisa
- **Cuando** el usuario seleccione el tipo "Transferencia" en la planilla de nuevo movimiento y la cuenta de origen posea una moneda distinta a la cuenta de destino (`fromAccount.currency !== toAccount.currency`):
  - **El sistema debe** desplegar un panel reactivo de conversión cambiaria en tiempo real.
  - **El sistema debe** calcular y presentar la tasa de cambio efectiva entre ambas monedas y el monto resultante a acreditar en la cuenta de destino según las tasas de la tabla de monedas.
  - **El sistema debe** permitir al usuario editar libremente la tasa de cambio aplicada o el monto de destino.

### RF-4: Herencia Automática de la Tasa Cambiaria a la Tabla de Monedas
- **Cuando** se guarde una transacción con tasa cambiaria editada por el usuario:
  - **El sistema debe** registrar en la transacción el `amount` (monto debitado en moneda origen), `toAmount` (monto acreditado en moneda destino) y `exchangeRate` (tasa aplicada).
  - **El sistema debe** actualizar automáticamente la cotización de la moneda contra CLP en la tabla de monedas del sistema (`state.currencies`), heredando el valor fijado en la transacción.

### RF-5: Acreditación Correcta en Balances de Cuentas
- **Cuando** se aplique una transferencia entre cuentas con distinta moneda:
  - **El sistema debe** debitar el `amount` en la moneda nativa de la cuenta de origen.
  - **El sistema debe** acreditar el `toAmount` en la moneda nativa de la cuenta de destino.

### RF-6: Consolidación Patrimonial Multidivisa en Moneda Base (CLP)
- **Cuando** se calcule el Patrimonio Neto total, Total Activos y Total Pasivos en el Dashboard:
  - **El sistema debe** convertir los saldos de cada cuenta a `CLP` multiplicando por su tasa `rateToCLP`.
  - Las tarjetas individuales de cuentas deben seguir exhibiendo su saldo nominal en su respectiva moneda nativa.

### RF-7: Sincronización Multi-Dispositivo y Respaldo de Monedas
- **El sistema debe** incluir la tabla de monedas en los respaldos JSON (`exportBackup`/`importBackup`), en el documento consolidado `workspaces/main` de Firestore y en la función pura `Calculations.fusionarEstadoContable`.
