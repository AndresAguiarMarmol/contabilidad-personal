# Plan Técnico — Spec 003 (Creación de Nuevas Cuentas Financieras)

## 1. Archivos Involucrados y Responsabilidades
- `assets/js/financeCalculations.js`: Extensión de funciones puras de negocio:
  - `validarNuevaCuenta(datos, cuentasExistentes)`: Validación pura de nombre, duplicados y tipo válido (RF-2).
  - `crearCuentaObjeto(datos)`: Fábrica de objeto de cuenta inmutable con asignación de icono y color (RF-3, RF-4).
- `assets/js/app.js`: Implementación de la función `openAccountModal()`, inyección del formulario en `<dialog id="app-modal">`, enlace de eventos del botón "+ Nueva Cuenta", persistencia en `Storage` y actualización de vistas.
- `tests/accounts.test.js`: Suite de pruebas unitarias automatizadas con `node --test`.

## 2. Lógica Pura y Modelos de Datos (RF-2, RF-3, RF-4)
```javascript
// Validación de datos de cuenta
function validarNuevaCuenta(datos, cuentasExistentes) {
  // Retorna { valida: boolean, error?: string }
}

// Creación de objeto normalizado
function crearCuentaObjeto(datos) {
  // Retorna objeto Account completo y listo para persistir
}
```

## 3. Mapeo de Iconos y Colores por Defecto según Tipo
| Tipo de Cuenta | Clave (`type`) | Icono Lucide por Defecto | Color por Defecto |
| :--- | :--- | :--- | :--- |
| Cuenta Bancaria | `bank` | `building-2` | `#2563eb` (Azul) |
| Billetera Efectivo | `cash` | `wallet` | `#16a34a` (Verde) |
| Billetera Digital | `wallet` | `smartphone` | `#0284c7` (Celeste) |
| Ahorro / Inversión | `savings` | `piggy-bank` | `#7c3aed` (Morado) |
| Tarjeta de Crédito | `credit_card` | `credit-card` | `#e11d48` (Rojo / Rosa) |

## 4. Algoritmo y Flujo de Interfaz
1. **Apertura de la planilla (`openAccountModal()`):**
   - Se inyecta el formulario en `<dialog id="app-modal">`.
   - Se precargan los campos con valores por defecto (Tipo: Cuenta Bancaria, Moneda: CLP, Saldo Inicial: 0).
   - Se invoca `dialog.showModal()`.
2. **Envío y Validación (`submit`):**
   - Se limpian espacios del nombre (`trim()`).
   - Se ejecuta `validarNuevaCuenta()`.
   - Si no es válida, se notifica con `showToast(error, "error")` y se mantiene el diálogo abierto.
   - Si es válida:
     - Si el tipo es `credit_card` y el saldo inicial ingresado es positivo, se almacena como valor negativo para reflejar pasivo.
     - Se invoca `crearCuentaObjeto()` y se añade al array `state.accounts`.
     - Se persiste con `Storage.saveAccounts(state.accounts)`.
     - Se cierra el modal, se refresca la vista activa con `renderActiveView()` y se notifica con Toast de éxito.

## 5. Estrategia de Pruebas y Cobertura de RF
- `tests/accounts.test.js`:
  - **Test RF-2:** Rechaza nombre vacío o compuesto únicamente por espacios.
  - **Test RF-2:** Rechaza nombre duplicado (insensible a mayúsculas/minúsculas).
  - **Test RF-2:** Rechaza tipo de cuenta no soportado.
  - **Test RF-3:** Tarjeta de crédito convierte saldo adeudado inicial en saldo negativo contable.
  - **Test RF-4:** Asigna correctamente icono y color por defecto según el tipo seleccionado.
