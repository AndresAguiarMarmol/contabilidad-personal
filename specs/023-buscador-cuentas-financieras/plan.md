# Plan Técnico — Spec 023: Buscador y Filtro de Cuentas Financieras, Billeteras y Tarjetas

**Estado:** Aprobado  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Arquitectura y Responsabilidades de Módulos

El diseño sigue el principio de separación estricta de responsabilidades del proyecto:

1. **Lógica de Filtrado Pura (`assets/js/financeCalculations.js`):**
   - Función pura `filtrarCuentasFinancieras(cuentas, terminoBusqueda)`
   - Cero dependencias de DOM o almacenamiento.
   - Normalización de strings para insensibilidad a mayúsculas, minúsculas y diacríticos (acentos/tildes).
   - Cobertura de campos: `name`, `type` (traducción amigable y técnica), y `currency`.
   - Traza: Resuelve **RF-2**, **RF-3**, **RF-4**.

2. **Capa de Interfaz de Usuario (`index.html`):**
   - En la cabecera de `<section id="view-accounts">`, incorporar una barra con input interactivo de búsqueda (`#accounts-search-input`) con icono `search`, placeholder contextual y botón para limpiar (`#btn-clear-accounts-search`).
   - Contenedor para estado sin resultados (`#accounts-empty-search`).
   - Traza: Resuelve **RF-1**, **RF-4**.

3. **Controlador y Manejo de Eventos (`assets/js/app.js`):**
   - Mantener `state.accountsSearchTerm = ""` en el estado reactivo.
   - Conectar el evento `input` en `#accounts-search-input` para actualizar el término en tiempo real y re-renderizar `#accounts-grid`.
   - Limpieza rápida mediante `#btn-clear-accounts-search`.
   - Delegación continua de eventos para clic en tarjeta (`openAccountDetail`), edición (`openAccountEditModal`) y eliminación (`solicitarEliminarCuentaFinanciera`).
   - Traza: Resuelve **RF-1**, **RF-2**, **RF-3**, **RF-5**.

---

## 2. Diseño de Lógica Pura

### Algoritmo de Normalización y Filtrado:
```javascript
function normalizarTexto(texto = "") {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function filtrarCuentasFinancieras(cuentas = [], termino = "") {
  if (!Array.isArray(cuentas)) return [];
  const termNorm = normalizarTexto(termino);
  if (!termNorm) return [...cuentas];

  const typeLabels = {
    bank: "cuenta bancaria banco corriente vista",
    cash: "efectivo caja billetera efectivo",
    wallet: "billetera digital mercadopago mach prepago",
    savings: "ahorro inversion deposito fondo mutuo",
    credit_card: "tarjeta de credito pasivo deuda visa mastercard"
  };

  return cuentas.filter(acc => {
    if (!acc || typeof acc !== "object") return false;
    const nameNorm = normalizarTexto(acc.name);
    const currNorm = normalizarTexto(acc.currency);
    const typeKeyNorm = normalizarTexto(acc.type);
    const typeLabelNorm = normalizarTexto(typeLabels[acc.type] || "");

    return (
      nameNorm.includes(termNorm) ||
      currNorm.includes(termNorm) ||
      typeKeyNorm.includes(termNorm) ||
      typeLabelNorm.includes(termNorm)
    );
  });
}
```

---

## 3. Decisiones Técnicas y Alternativas Descartadas

- **Decisión 1: Filtrado en memoria de `state.accounts` en lugar de consulta a persistencia:**
  - *Alternativa descartada:* Consultar a `localStorage` o recargar datos en cada tecla.
  - *Justificación:* Las cuentas son típicamente entre 1 y 20 elementos. Filtrar en memoria el array `state.accounts` es instantáneo (< 1ms) y no genera lecturas I/O innecesarias.
- **Decisión 2: Barra de búsqueda siempre visible integrada en la barra de herramientas:**
  - *Alternativa descartada:* Botón de lupa que despliega un modal emergente o expande un input oculto.
  - *Justificación:* Seleccionada por el usuario (Opción A). Mantiene consistencia visual con las vistas de Movimientos y Plan de Cuentas.
- **Decisión 3: Normalización NFD para remoción de tildes:**
  - *Justificación:* Permite que "crédito" y "credito", o "banco" y "bancó" coincidan transparentemente sin importar cómo escriba el usuario.

---

## 4. Estrategia de Pruebas Unitarias (TDD)
- Archivo de prueba: `tests/accounts-search.test.js`
- Casos a verificar con `node --test`:
  1. Retorna la lista intacta si el término está vacío o compuesto por espacios.
  2. Filtra por coincidencia parcial de nombre ("santander", "Banco", "caja").
  3. Insensibilidad a mayúsculas y acentos ("CREDITO" -> tarjeta de crédito, "chile" -> Banco de Chile).
  4. Filtra por código de moneda ("USD" -> cuentas en dólares, "CLP" -> cuentas en pesos).
  5. Retorna array vacío `[]` cuando ningún elemento coincide.
  6. Manejo defensivo ante entradas nulas, indefinidas o tipos de datos anómalos.
