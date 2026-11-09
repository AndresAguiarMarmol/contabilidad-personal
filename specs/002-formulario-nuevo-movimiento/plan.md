# Plan Técnico — Spec 002 (Planilla de Nuevos Movimientos)

## 1. Archivos Involucrados y Responsabilidades
- `assets/js/financeCalculations.js`: Extensión de funciones puras de negocio:
  - `validarTransaccion(datos)`: Reglas de validación sin dependencia del DOM (RF-4).
  - `aplicarTransaccionEnCuentas(accounts, tx)`: Cálculo puro de nuevos saldos sin mutación destructiva (RF-5, RF-6, RF-7).
- `assets/js/app.js`: Componente interactivo de la planilla modal (`renderTransactionModal`), enlace de eventos del formulario, conmutación dinámica de campos (cuentas y categorías) y actualización del estado global.
- `tests/transactions.test.js`: Suite de pruebas unitarias automatizadas con `node --test` para validar reglas de negocio y consistencia contable.

## 2. Lógica Pura y Modelos de Datos (RF-4, RF-5, RF-6, RF-7)
```javascript
// Validación pura de movimientos
function validarTransaccion(datos) {
  // Retorna { valida: boolean, error?: string }
}

// Actualización pura de saldos de cuentas
function aplicarTransaccionEnCuentas(accounts, tx) {
  // Retorna nueva copia inmutable de cuentas con saldos recalculados
}
```

## 3. Algoritmo y Flujo de Interfaz
1. **Apertura de la planilla (`openTransactionModal()`):**
   - El contenedor `<dialog id="app-modal">` se limpia e inyecta la planilla HTML accesible.
   - Se precargan las cuentas existentes en el `<select id="modal-tx-account">`.
   - Se precargan las categorías de Gasto en `<select id="modal-tx-category">`.
   - La fecha se inicializa con `new Date().toISOString().slice(0, 10)`.
   - Se invoca `dialog.showModal()`.
2. **Conmutación reactiva de tipo (Gasto / Ingreso / Transferencia):**
   - Al pulsar "Gasto": se muestran categorías de egresos; se oculta cuenta destino.
   - Al pulsar "Ingreso": se muestran categorías de ingresos; se oculta cuenta destino.
   - Al pulsar "Transferencia": se oculta el selector de categorías y se muestra el selector de cuenta destino (`toAccountId`), filtrando para excluir la cuenta origen seleccionada.
3. **Confirmación y Guardado (`submit`):**
   - Se capturan y normalizan los valores del formulario.
   - Se pasa por `validarTransaccion()`. Si falla, se muestra alerta/toast y se previene el cierre.
   - Se ejecuta `aplicarTransaccionEnCuentas()`.
   - Se persiste en `Storage.saveAccounts()` y `Storage.saveTransactions()`.
   - Se cierran el modal y se refresca la vista activa con `renderActiveView()`.
   - Se notifica con `showToast("Movimiento registrado con éxito", "success")`.

## 4. Decisiones Técnicas y Alternativas Descartadas
- **Decisión:** Reutilizar el diálogo nativo `<dialog id="app-modal">` con backdrop blur en lugar de inyectar divs con `position: absolute`.
  - *Alternativa descartada:* Modales manuales con z-index alto. *Rechazada:* `<dialog>` nativo maneja automáticamente accesibilidad, bloqueo de foco, tecla Escape y cierre accesible.
- **Decisión:** Calcular el impacto en cuentas mediante una función pura que retorne un nuevo array de cuentas.
  - *Alternativa descartada:* Modificar directamente los objetos en el evento del DOM. *Rechazada:* la inmutabilidad permite testear el 100% de la lógica en `node --test` sin simular el navegador.

## 5. Estrategia de Pruebas y Cobertura de RF
- `tests/transactions.test.js`:
  - **Test RF-4:** Validación de monto inválido (<= 0 o no numérico).
  - **Test RF-4:** Validación de descripción vacía.
  - **Test RF-4:** Validación de transferencia a la misma cuenta de origen.
  - **Test RF-5:** Gasto descuenta correctamente el saldo de la cuenta indicada.
  - **Test RF-6:** Ingreso suma correctamente el saldo de la cuenta indicada.
  - **Test RF-7:** Transferencia debita de cuenta origen y acredita en cuenta destino.
