---
name: plantilla-base-apps
description: Define y aplica los estándares de diseño, estructura visual, componentes (Header, Footer, paleta de colores) y convenciones técnicas para todas las aplicaciones web de Andrés Aguiar. Úsala al crear o modificar interfaces en HTML, CSS, JavaScript o Reflex.
version: 1.0.0
author: Andrés Aguiar Mármol
location: Santiago de Chile
---

# Estándares de Diseño y UI - Andrés Aguiar

Esta skill establece la guía de estilo obligatoria para la construcción de interfaces web, single-page applications (SPAs) y progressive web apps (PWAs). Cualquier código visual generado debe respetar estas definiciones.

---

## 1. Estructura y Componentes Clave

### Encabezado (Header)
* **Estilo:** Barra superior fija o estática, sobria y limpia.
* **Elementos:**
  * Título de la aplicación en tipografía destacada (`Inter` o `system-ui`).
  * Subtítulo contextual breve o indicador de estado de conexión/sesión.
  * Botón o menú de ajustes/acciones a la derecha.
* **Diseño visual:**
  * Fondo oscuro o contraste marcado con sombra suave inferior:
    ```css
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    ```

### Pie de Página (Footer Obligatorio)
* **Texto de firma estándar:**
  `Análisis/Diseño de Andrés Aguiar | Santiago de Chile` (incluyendo mes y año actual si aplica).
* **Posición:**
  * Al final del contenedor principal o fijado al fondo de la pantalla (*sticky footer*).
* **Tipografía y tono:**
  * Texto centrado.
  * Tamaño reducido (`0.85rem` o `13px`).
  * Color atenuado/secundario para no competir con el contenido principal.

---

## 2. Paleta de Colores y Tipografía

* **Tipografía principal:**
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  ```
* **Variables CSS Sugeridas (:root):**
  ```css
  :root {
    --bg-primary: #F8F9FA;
    --bg-surface: #FFFFFF;
    --text-primary: #212529;
    --text-secondary: #6C757D;
    --accent-color: #0D6EFD;
    --accent-hover: #0B5ED7;
    --border-color: #E9ECEF;
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
  }
  ```
* **Tema predilecto:**
  * Modo claro minimalista con fondos limpios (`#F8F9FA`) o modo oscuro sobrio (`#121212`).
* **Botones y Acciones:**
  * Botones con esquinas redondeadas suaves (`border-radius: var(--radius-md)`).
  * Estados `:hover`, `:active` y `:focus-visible` claramente diferenciados.

---

## 3. Convenciones Técnicas de Frontend

* **Arquitectura Semántica:**
  * Uso estricto de etiquetas HTML5 semánticas (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`).
* **JavaScript:**
  * Vanilla JS moderno (ES6+), modular y limpio.
  * Evitar dependencias o frameworks pesados innecesarios salvo que la funcionalidad lo exija expresamente.
* **Diseño Responsivo:**
  * Mobile-first o desktop-first con adaptabilidad vía Flexbox y CSS Grid.
  * Sin desbordamiento horizontal en pantallas pequeñas.
* **Persistencia:**
  * Preferencia por almacenamiento local del navegador (`localStorage`) para configuraciones, preferencias y datos temporales antes de requerir base de datos o backend.

---

## 4. Checklist de Validación antes de Entregar Código

- [ ] ¿Incluye el `<header>` con título claro, subtítulo y estructura limpia?
- [ ] ¿El `<footer>` contiene la firma oficial de autoría (`Análisis/Diseño de Andrés Aguiar | Santiago de Chile`)?
- [ ] ¿El layout es 100% responsivo y adapta componentes en dispositivos móviles?
- [ ] ¿El código CSS utiliza variables (`:root`) para colores y radios de borde?
- [ ] ¿Se utiliza HTML5 semántico en toda la estructura del documento?