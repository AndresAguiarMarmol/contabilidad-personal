# Especificación Funcional — Spec 028: Ergonomía Móvil del Dashboard y Alineación Inferior del Footer

**Estado:** Aprobada  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Contexto y Justificación

Al utilizar la aplicación en dispositivos móviles (iPhone en vista vertical), las tarjetas de métricas del Dashboard (Patrimonio Neto, Ingresos del Mes, Gastos del Mes y Tasa de Ahorro) se mostraban en una sola columna (`grid-cols-1`) con un relleno interno excesivo (`p-5`) e iconos grandes (`w-12 h-12`). Esto provocaba que cada tarjeta ocupara la pantalla casi en su totalidad, obligando a realizar scroll vertical constante para tener una visión panorámica de las finanzas.

Por otra parte, en computadoras de escritorio (PC) con pantallas panorámicas o de alta resolución, al visualizar secciones con poco contenido o listas cortas, el pie de página (`#app-footer`) quedaba ubicado visualmente a media altura de la pantalla (en el centro vertical) en lugar de posicionarse en la parte inferior de la ventana.

Esta especificación resuelve ambos problemas de usabilidad y diseño responsivo.

---

## 2. Historias de Usuario

- **HU-1 (Móvil):** Como usuario de iPhone en vista vertical, quiero que las tarjetas de métricas del Dashboard tengan un tamaño más compacto y se organicen en 2 columnas por fila, para ver las cifras clave de un solo vistazo sin que ocupen toda la pantalla vertical.
- **HU-2 (PC / Escritorio):** Como usuario en computadora, quiero que el pie de página de la aplicación se ubique siempre en la parte inferior de la ventana cuando el contenido sea breve, para mantener una apariencia limpia, profesional y equilibrada.

---

## 3. Requisitos Funcionales (EARS)

### RF-1: Cuadrícula Responsiva de Métricas del Dashboard (2 por fila en móvil)
*Ubicuo:*  
El sistema debe organizar las tarjetas de métricas del Dashboard en una cuadrícula de 2 columnas por fila en pantallas móviles (`grid-cols-2`), escalando a 2 o 4 columnas en pantallas medianas y grandes (`sm:grid-cols-2 lg:grid-cols-4`).

### RF-2: Ergonomía y Proporción Compacta de Tarjetas en Móvil
*Ubicuo:*  
El sistema debe reducir el relleno interno (`p-3 sm:p-5`) y dimensionar los textos e iconos de las tarjetas de métricas (`w-8 h-8 sm:w-12 sm:h-12`) para garantizar que la información (título, cifra y desglose) se lea de forma clara, sin desbordes ni truncamientos forzados en pantallas de 375px a 430px de ancho.

### RF-3: Cuadrícula de Presupuestos en Dashboard Adaptada a Móvil
*Ubicuo:*  
La lista de alertas de presupuestos en el Dashboard debe organizarse en 2 columnas en dispositivos móviles (`grid-cols-2 sm:grid-cols-2 lg:grid-cols-4`) con diseño compacto.

### RF-4: Fijación del Footer en la Parte Baja de la Pantalla (Sticky Bottom)
*Ubicuo:*  
El sistema debe utilizar un contenedor flexible vertical (`flex flex-col`) para el área principal de la app (`<main>`) y asignar margen superior automático (`mt-auto`) al elemento `#app-footer`, asegurando que en pantallas de PC el pie de página se posicione al ras del fondo de la ventana cuando el contenido sea inferior a la altura del viewport, y fluya al final del scroll cuando el contenido sea extenso.

---

## 4. Requisitos No Funcionales (RNF)

- **RNF-1 (Cero Regresiones):** No debe alterar la lógica contable, los selectores de datos (`#dash-net-worth`, etc.) ni los identificadores de eventos de la aplicación.
- **RNF-2 (Consistencia Visual):** El diseño debe respetar Tailwind CSS nativo y verse equilibrado en temas claro y oscuro.
- **RNF-3 (Compatibilidad Safari iOS):** La disposición de flexbox y grid debe ser 100% compatible con WebKit / Safari iOS en iPhone.

---

## 5. Criterios de Aceptación (Checklist)

- [ ] En pantallas móviles, las tarjetas KPI del Dashboard se muestran en 2 columnas por fila (`grid-cols-2`).
- [ ] En pantallas móviles, las tarjetas KPI tienen padding compacto (`p-3`) e iconos proporcionados (`w-8 h-8`).
- [ ] En pantallas grandes (PC), el pie de página `#app-footer` se sitúa en la parte inferior de la ventana gracias a `flex flex-col` y `mt-auto`.
- [ ] Con contenidos largos, el scroll opera de manera natural y el footer aparece al final del documento.
