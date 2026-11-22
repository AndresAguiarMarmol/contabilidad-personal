# Especificación Funcional — Spec 029: Ergonomía Móvil de Cuentas Financieras (2 por Fila en iPhone)

**Estado:** Aprobada  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Contexto y Justificación

En la vista "Cuentas Bancarias, Billeteras y Tarjetas" (`#view-accounts`), las tarjetas de cuentas financieras se organizaban en una sola columna (`grid-cols-1`) en dispositivos móviles, con relleno interior amplio (`p-5`), iconos de gran tamaño (`w-10 h-10`), botones grandes y tipografía desproporcionada. En pantallas de iPhone en vista vertical, cada tarjeta ocupaba casi la totalidad de la pantalla, requiriendo un desplazamiento excesivo para comparar o visualizar múltiples cuentas.

Esta especificación adapta la cuadrícula y las tarjetas para desplegar **2 elementos por fila en pantallas móviles** con proporciones equilibradas.

---

## 2. Historias de Usuario

- **HU-1:** Como usuario de iPhone en vista vertical, quiero que las tarjetas de cuentas bancarias y billeteras se muestren en 2 columnas por fila, con dimensiones compactas y legibles, para ver más cuentas en pantalla sin tener que hacer scroll continuo.
- **HU-2:** Como usuario móvil, quiero seguir accediendo con facilidad a los botones de editar (✏️), eliminar (🗑️) y al detalle de cada cuenta, sin que los elementos se solapen ni se corten los saldos monetarios.

---

## 3. Requisitos Funcionales (EARS)

### RF-1: Cuadrícula Responsiva de Cuentas (2 columnas en móvil)
*Ubicuo:*  
El sistema debe organizar el contenedor `#accounts-grid` en 2 columnas por fila en dispositivos móviles (`grid-cols-2`), escalando a 2 o 3 columnas en pantallas medianas y grandes (`sm:grid-cols-2 lg:grid-cols-3`).

### RF-2: Proporción y Relleno Compacto en Tarjetas de Cuenta
*Ubicuo:*  
Cada tarjeta de cuenta financiera (`.account-card`) debe tener un relleno interno reducido en móviles (`p-3 sm:p-5`), espaciado vertical proporcional (`space-y-2 sm:space-y-4`) e iconos de cabecera adaptados (`w-7 h-7 sm:w-10 sm:h-10`), permitiendo una visualización limpia y ordenada de 2 tarjetas contiguas.

### RF-3: Legibilidad de Saldos y Acciones en Pantalla Móvil
*Ubicuo:*  
El sistema debe dimensionar los títulos, insignias y saldos de las cuentas (`text-sm sm:text-xl font-bold tabular-nums truncate`) y los botones de acción rápida de edición y eliminación (`p-1 sm:p-1.5`), garantizando que sigan siendo fácilmente accionables y legibles.

---

## 4. Requisitos No Funcionales (RNF)

- **RNF-1 (Cero Regresiones):** Debe preservar íntegramente los identificadores de atributos `data-account-id`, `data-id`, y los listeners de navegación a la vista de detalle de cuenta (`openAccountDetail`), edición (`openAccountEditModal`) y eliminación (`solicitarEliminarCuentaFinanciera`).
- **RNF-2 (Consistencia con Spec 023 y Spec 028):** Integración armónica con el buscador reactivo de cuentas `#accounts-search-input` y la barra de conteo.

---

## 5. Criterios de Aceptación (Checklist)

- [ ] `#accounts-grid` contiene la clase `grid-cols-2` para pantallas móviles.
- [ ] Las tarjetas `.account-card` cuentan con clases responsivas de relleno `p-3 sm:p-5`.
- [ ] Los iconos y botones de acción en la tarjeta se adaptan para no desbordar en columnas estrechas de 175px-200px.
- [ ] Los saldos monetarios y nombres de cuenta se visualizan sin desbordes horizontales ni superposiciones.
