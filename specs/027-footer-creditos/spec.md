# Especificación Funcional — Spec 027: Footer de Créditos, Versión y Contacto

**Estado:** Aprobada  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Contexto y Justificación

Para otorgar identidad profesional, trazabilidad de versión y un canal directo de contacto y soporte a los usuarios de la aplicación de Contabilidad Personal y Gestión Patrimonial (PWA), se requiere incorporar en el pie de página (footer) de la aplicación los datos de autoría, versión de lanzamiento y contacto por WhatsApp.

---

## 2. Historias de Usuario

- **HU-1:** Como usuario o evaluador de la app, quiero visualizar en el pie de página quién realizó el análisis y diseño, la versión actual de la aplicación y la ubicación geográfica, para conocer la procedencia y madurez del software.
- **HU-2:** Como usuario de la app, quiero disponer de un enlace directo y accesible a WhatsApp para contactar al diseñador o solicitar soporte de forma rápida desde mi móvil o PC.

---

## 3. Requisitos Funcionales (EARS)

### RF-1: Presentación de los Créditos y Autoría
*Ubicuo:*  
El sistema debe mostrar en el pie de página de la aplicación la mención formal de autoría: **Análisis y Diseño: Andres Aguiar**.

### RF-2: Identificación de Versión y Origen
*Ubicuo:*  
El sistema debe mostrar en el pie de página la versión y ubicación: **Versión: V1.0 — Santiago de Chile**.

### RF-3: Canal de Contacto y Enlace Directo a WhatsApp
*Ubicuo:*  
El sistema debe mostrar la línea de contacto: **Contacto / WhatsApp: +56933395447**, configurada como un hipervínculo interactivo que dirija a `https://wa.me/56933395447`.

### RF-4: Apertura Segura en Nueva Pestaña
*Dirigido por eventos:*  
Cuando el usuario haga clic o toque en el enlace de WhatsApp, el sistema debe abrir la conversación en una nueva ventana o pestaña del navegador sin abandonar la sesión de la aplicación (`target="_blank" rel="noopener noreferrer"`).

### RF-5: Presencia en Vista Autenticada y Pantalla de Acceso
*Ubicuo:*  
La información de créditos debe estar presente tanto en el pie del contenido principal de la aplicación (`#app-container`) como en la pantalla de bienvenida y autenticación (`#auth-gate-screen`).

---

## 4. Requisitos No Funcionales (RNF)

- **RNF-1 (Ergonomía y Estética Visual):** El diseño debe respetar la paleta tipográfica y esquemas de color existentes, luciendo sobrio y perfectamente legible tanto en tema claro como en tema oscuro.
- **RNF-2 (Responsividad):** En pantallas pequeñas de teléfonos móviles, los elementos deben organizarse armoniosamente sin desbordes horizontales ni solapamientos.
- **RNF-3 (Rendimiento):** Cero dependencias externas adicionales; debe utilizar HTML semántico y utilidades Tailwind CSS ya presentes.

---

## 5. Criterios de Aceptación (Checklist)

- [ ] Contiene el texto exacto: `Análisis y Diseño: Andres Aguiar`.
- [ ] Contiene el texto exacto: `Versión: V1.0 — Santiago de Chile`.
- [ ] Contiene el texto exacto y enlace: `Contacto / WhatsApp: +56933395447` apuntando a `https://wa.me/56933395447`.
- [ ] El enlace abre en pestaña nueva con `target="_blank"` y `rel="noopener noreferrer"`.
- [ ] Visible en el pie del contenido principal y en la pantalla de acceso.
