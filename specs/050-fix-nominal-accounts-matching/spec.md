# Spec 050: Blindaje de Asignación Contable contra Palabras Genéricas (Stop-Words) y Coherencia de Clase en el Plan de Cuentas

## 1. Visión General y Propósito
Garantizar que ninguna cuenta o subcuenta nominal de Gastos (Clase 5) o Ingresos (Clase 4) reciba saldo o movimiento indebido por coincidencias difusas accidentales con palabras genéricas (como *"otros"*, *"para"*, *"como"*), o por transacciones con contradicciones de clase (ej. un gasto clasificado erróneamente con código de ingreso). Asegurar que cuentas como `5.1.01` ("Luz") y `5.6.02.03` ("Productos para la Piel, Cremas, Perfumes y otros") reflejen saldo $0 cuando no existan transacciones legítimas asignadas a ellas.

---

## 2. Decisiones de Diseño y Requisitos de Usuario
- **Exclusión Estricta de Stop-Words en `matchCategory`:** Palabras como *"otros"*, *"otras"*, *"para"*, *"como"*, *"todo"*, *"este"* quedan excluidas de la tokenización de similitud de categorías para impedir que categorías como *"Otros Ingresos"* contaminen subcuentas como *"Productos para la piel y otros"*.
- **Coherencia de Clase (Gasto vs Ingreso):**
  - Si una transacción es de tipo `expense`, sus montos solo pueden impactar cuentas de Clase 5 (o transferencias/pasivos). Si la transacción tiene un `categoryCode` que pertenece a Clase 4 (Ingreso) o una categoría discordante, se neutraliza la asignación errónea y se asigna al rubro genérico `5.7.01` (Gastos Varios) en lugar de una subcuenta específica.
- **Reclasificación de Transacciones Existentes en Firestore:**
  - `TX-1795644643983` ($10.930, "Muni Mercado", Tottus S.A.): Reclasificada a `5.2.01.01 Supermercado` (Decisión 1.a).
  - `TX-1795824079087` ($5.997, "Adornos Navideños"): Reclasificada a `5.1.01.04 Reparaciones Casa` (Decisión 2.a).
  - Con esto, tanto `5.1.01` ("Luz") como `5.6.02.03` quedan con saldo exacto de $0.

---

## 3. Requisitos Funcionales en Sintaxis Formal EARS

### RF-1: Filtrado de Stop-Words en `matchCategory`
- **[Ubiquitous]** La función de coincidencia de categorías en `obtenerCatalogoPlanCuentas` filtrará palabras genéricas (*stop-words*) en español con longitud o relevancia insuficiente (incluyendo `"otros"`, `"otras"`, `"para"`, `"como"`, `"todo"`, `"toda"`, `"este"`, `"esta"`).
- **[State-driven]** Mientras una coincidencia entre el nombre de la cuenta y la categoría dependa exclusivamente de una palabra genérica excluida, el sistema devolverá `false`.

### RF-2: Coherencia de Clase en Transacciones
- **[Event-driven]** Al procesar un movimiento de tipo `expense`:
  - Si el movimiento posee `categoryCode` perteneciente a Clase 4 (ej. `"4.3.01"`), el sistema no intentará buscar coincidencias difusas en subcuentas de Clase 5 basadas en el nombre del ingreso.
  - Si no existe coincidencia legítima en Clase 5, el movimiento se acumulará en `5.7.01` (Gastos Financieros e Imprevistos).

### RF-3: Saneamiento de Cuentas 5.1.01 y 5.6.02.03
- **[Event-driven]** Tras aplicar la reclasificación y el blindaje:
  - La cuenta `5.1.01` ("Luz") tendrá `periodMovement = 0` y `balance = 0`.
  - La cuenta `5.6.02.03` ("Productos para la Piel, Cremas, Perfumes y otros") tendrá `periodMovement = 0` y `balance = 0`.
  - La cuenta `5.2.01.01` ("Supermercado") acumulará los $10.930 de Tottus S.A.
  - La cuenta `5.1.01.04` ("Reparaciones Casa") acumulará los $5.997 de Adornos Navideños.
