# Plan de Arquitectura y Diseño Técnico — Spec 013 (Cuentas Secundarias en Plan de Cuentas)

## 1. Arquitectura y Modelado de Datos

### Estructura de Cuenta Contable con Jerarquía Padre-Hijo
Una cuenta contable en el Plan de Cuentas puede ser de dos niveles:
- **Nivel Base (Cuenta Principal / Base):** `code` con formato `X.Y.ZZ` (ej. `5.1.01`), `parentCode: null`, `isSubaccount: false`.
- **Nivel Secundario (Subcuenta / Cuenta Hija):** `code` con formato `X.Y.ZZ.NN` (ej. `5.1.01.01`), `parentCode: "5.1.01"`, `parentAccountId: "P-5-1-01"`, `isSubaccount: true`.

```json
{
  "id": "PLAN-SUB-1731460000000",
  "code": "5.1.01.01",
  "name": "Alquiler de Vivienda",
  "parentCode": "5.1.01",
  "parentAccountId": "P-5-1-01",
  "isSubaccount": true,
  "classNumber": 5,
  "classType": "expense",
  "groupName": "5.1 Vivienda y Hogar",
  "nature": "debit",
  "balance": 0,
  "periodMovement": 0,
  "isSystem": false,
  "icon": "home"
}
```

---

## 2. Funciones Puras en `financeCalculations.js`

### A. `generarSiguienteCodigoSubcuenta(parentCode, catalogoExistente = [])`
- Analiza las cuentas existentes en el catálogo que tengan el mismo `parentCode` o cuyo código comience con `${parentCode}.`.
- Extrae la parte numérica final de los códigos coincidentes (ej. en `5.1.01.01`, extrae `1`; en `5.1.01.02`, extrae `2`).
- Determina el máximo correlativo actual y retorna el siguiente formateado a 2 dígitos con relleno de cero a la izquierda (ej. `5.1.01.03`).
- Si no existe ninguna subcuenta previa, retorna `${parentCode}.01`.

### B. `validarCuentaPlan(cuenta, catalogoExistente, idActual)`
- Se amplía para validar cuentas secundarias:
  - Si `cuenta.parentCode` está presente:
    - La cuenta padre debe existir en `catalogoExistente`.
    - El código de la subcuenta debe iniciar con `${cuenta.parentCode}.`.
    - No puede haber código duplicado en el catálogo.
    - No puede haber subcuenta con el mismo nombre bajo el mismo padre.

---

## 3. Integración en la Interfaz de Usuario (`app.js`)

1. **Tabla de Cuentas Contables (`renderChartOfAccounts`):**
   - Ordenar las cuentas de forma que las subcuentas se ubiquen inmediatamente después de su cuenta padre:
     `code.localeCompare(otherCode, undefined, { numeric: true, sensitivity: 'base' })`.
   - Si `acc.isSubaccount` es verdadero (o `acc.parentCode` existe):
     - Aplicar padding/indentación a la celda de nombre y código.
     - Mostrar icono conector `↳` y badge `Subcuenta de [parentCode]`.
   - Si `acc.isSystem` es verdadero (Cuenta Base) o es una cuenta de nivel 1/2:
     - Añadir botón de acción rápida `+ Subcuenta` (`btn-add-subaccount`, icono `plus`) para abrir el modal preseleccionando esa cuenta padre.

2. **Modal de Creación y Edición (`openPlanAccountModal`):**
   - Parámetros: `openPlanAccountModal(planAccountId = null, preselectedParentCode = null)`.
   - Añadir campo selector: `Cuenta Base Padre (Opcional / Subcuenta)`.
   - Al seleccionar una cuenta padre:
     - Calcular automáticamente el siguiente código con `generarSiguienteCodigoSubcuenta(parentCode, fullCatalog)` y rellenar el input `#plan-input-code`.
     - Autocompletar y bloquear Clase Contable, Grupo y Naturaleza heredados de la cuenta padre.
   - Si se deselecciona ("Cuenta Principal Independiente"), reactivar los campos para entrada libre.

3. **Sincronización con Categorías (`obtenerCategoriasDesdePlan`):**
   - Las cuentas secundarias creadas bajo las clases 5, 4 y 1.3 se incluyen automáticamente con su formato `5.1.01.01 · Alquiler de Vivienda`, permitiendo seleccionarlas con total naturalidad al crear movimientos o presupuestos.

---

## 4. Estrategia de Pruebas (TDD)
- Archivo de prueba: `tests/subaccounts-plan.test.js`.
- Casos a verificar:
  1. `generarSiguienteCodigoSubcuenta` genera `.01` cuando no hay subcuentas.
  2. `generarSiguienteCodigoSubcuenta` genera `.02`, `.03`, etc. según las subcuentas existentes.
  3. `validarCuentaPlan` valida que el código de la subcuenta coincida con el prefijo de la cuenta padre.
  4. `validarCuentaPlan` rechaza subcuenta duplicada o con nombre repetido bajo el mismo padre.
  5. `obtenerCatalogoPlanCuentas` integra y clasifica subcuentas personalizadas manteniendo la jerarquía contable.
