# Especificación Funcional — Spec 030: Header de Aplicación con Identidad de Marca y Menú a la Derecha

**Estado:** Aprobada  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Contexto y Justificación

Anteriormente, la cabecera superior (`<header>`) de la aplicación presentaba el botón del menú de navegación a la izquierda (en dispositivos móviles), seguido de títulos dinámicos de cada vista, mientras que los botones de acción se agrupaban a la derecha.

Para unificar la identidad de marca en la barra superior en todos los dispositivos y optimizar la ergonomía táctil en móviles (donde la mayoría de los usuarios utiliza el pulgar derecho), el usuario requiere que en el header figure de forma permanente la marca institucional: **"ContaPersonal — Finanzas Personales"** en la parte izquierda, y que el botón de **Menú** se sitúe en la parte derecha de la cabecera.

---

## 2. Historias de Usuario

- **HU-1:** Como usuario en móvil o PC, quiero ver en el extremo izquierdo de la cabecera superior la marca "ContaPersonal" acompañada del subtítulo "Finanzas Personales", para identificar claramente la aplicación en todo momento.
- **HU-2:** Como usuario móvil, quiero acceder al botón de Menú desde el extremo derecho de la cabecera, para poder abrir la navegación cómodamente con una sola mano.
- **HU-3:** Como usuario en PC, quiero poder utilizar el botón de Menú para alternar la visibilidad de la barra lateral, ganando espacio de pantalla según lo requiera.

---

## 3. Requisitos Funcionales (EARS)

### RF-1: Identidad de Marca en el Extremo Izquierdo del Header
*Ubicuo:*  
El sistema debe mostrar en el lado izquierdo de la cabecera superior (`<header>`) el isotipo distintivo de la app junto con el texto institucional **ContaPersonal** y el subtítulo **Finanzas Personales**.

### RF-2: Ubicación del Botón de Menú a la Derecha
*Ubicuo:*  
El sistema debe ubicar el botón de Menú (`#btn-open-sidebar`) en el lado derecho de la cabecera, integrado de forma armónica junto a los controles de usuario, sincronización y nuevo movimiento.

### RF-3: Interacción Responsiva del Botón de Menú
*Dirigido por eventos:*  
Cuando el usuario presione el botón de Menú en dispositivos móviles, el sistema debe desplegar el drawer de navegación lateral. Cuando se presione en computadoras de escritorio, el sistema debe alternar (colapsar o expandir) la barra lateral para maximizar el área de trabajo.

### RF-4: Preservación de Título de Vista Activa
*Ubicuo:*  
El sistema debe preservar los elementos identificadores de título y subtítulo de vista (`#page-title` y `#page-subtitle`) para mantener la trazabilidad de navegación en el código sin generar errores ni inconsistencias.

---

## 4. Requisitos No Funcionales (RNF)

- **RNF-1 (Ergonomía Táctil):** El botón de menú en la derecha debe contar con un área de toque adecuada (mínimo 36x36px) para interacción táctil fluida.
- **RNF-2 (Consistencia Estética):** El header debe mantener su altura (`h-16`) y adaptarse perfectamente a los temas claro y oscuro con bordes y tipografías consistentes.

---

## 5. Criterios de Aceptación (Checklist)

- [ ] El lado izquierdo del header contiene "ContaPersonal" y "Finanzas Personales".
- [ ] El botón `#btn-open-sidebar` está ubicado en el grupo de controles a la derecha de la cabecera.
- [ ] El botón `#btn-open-sidebar` contiene el icono de menú y el texto "Menú".
- [ ] Al hacer clic en móvil abre el menú lateral; al hacer clic en PC alterna la visibilidad de la barra lateral.
- [ ] Los selectores `#page-title` y `#page-subtitle` continúan existiendo en el DOM.
