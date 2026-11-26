# SPEC-045: Botón y Vista Dedicada para "Base de Datos en la Nube"

## 1. Contexto y Justificación
En el marco de la modularización y simplificación visual de la sección **Configuración** (`#view-settings`), se completó en la Spec 044 la conversión de las tablas embebidas de Monedas y Proveedores a botones interactivos con vistas dedicadas, además de la remoción de Supabase.

Siguiendo esta misma directriz de diseño UX/UI limpio y sin sobrecarga, el formulario y bloque de acciones de **"Base de Datos en la Nube (Firebase Cloud Firestore)"** que actualmente se encuentra incrustado en el cuerpo principal de Configuración debe ser reemplazado por una tarjeta de acceso interactiva con un botón directo (`#btn-settings-open-cloud-db`, con `data-nav-view="cloud-db"`). Este botón conduce a una vista dedicada (`#view-cloud-db`) que aloja íntegramente los campos de configuración, insignias de estado y botones operativos de Firestore, incorporando un botón de retorno rápido "Volver a Configuración".

## 2. Lenguaje Ubicuo (Ubiquitous Language)
- **Configuración (`#view-settings`):** Vista de ajustes centrales del sistema, ahora estructurada como un panel de control con tarjetas de acceso modular.
- **Tarjeta de Base de Datos en la Nube (`#settings-cloud-db-section`):** Componente tipo tarjeta en `#view-settings` con icono `flame`, título, badge de estado, descripción y botón interactivo hacia la vista dedicada.
- **Vista Dedicada de Base de Datos (`#view-cloud-db`):** Sección de pantalla completa que aloja las credenciales, prueba de conexión, sincronización y respaldos en la nube.
- **Botón de Retorno (`[data-nav-view="settings"]`):** Control que devuelve al usuario al panel de Configuración con un clic.
- **Sub-vista de Configuración:** Vistas secundarias (`chart-of-accounts`, `currencies`, `suppliers`, `cloud-db`) cuyo ítem de navegación activo en el menú lateral sigue siendo "Configuración".

## 3. Requisitos Funcionales (EARS)

### Ubiquitous / Siempre activos
- **RF-1 (Tarjeta de acceso en Configuración):** El sistema **debe** presentar en `#view-settings` la tarjeta `#settings-cloud-db-section` provista del botón `#btn-settings-open-cloud-db` con atributo `data-nav-view="cloud-db"`.
- **RF-2 (Vista dedicada `#view-cloud-db`):** El sistema **debe** contener en `index.html` la sección `<section id="view-cloud-db" class="hidden space-y-6">` que aloja los campos (`#firebase-project-id`, `#firebase-api-key`, etc.), botones de acción (`#btn-save-firebase`, `#btn-test-firebase`, `#btn-firebase-backup`, `#btn-firebase-sync`, `#btn-firebase-force-pull`) y feedback de conexión.
- **RF-3 (Botón de retorno):** La vista `#view-cloud-db` **debe** proveer un botón de retorno hacia Configuración mediante el atributo `data-nav-view="settings"`.
- **RF-4 (Mapeo de Navegación):** Cuando el usuario navegue a `cloud-db`, la función `switchView` **debe** asignar `settings` a `activeNavView`, manteniendo resaltado el botón "Configuración" en la barra lateral (`#sidebar`).
- **RF-5 (Registro de Metadatos y Renderizado):** El sistema **debe** registrar `cloud-db` en `VIEW_METADATA`, incluirlo en la lista de vistas de `switchView`, y ejecutar `renderSettings()` al activar la vista para poblar las credenciales e inicializar iconos.

## 4. Requisitos No Funcionales (NFR)
- **RNF-1 (Cero regresiones):** Ninguna funcionalidad existente de Firebase Firestore (guardado, prueba, backup, sincronización bidireccional, force-pull) debe verse alterada.
- **RNF-2 (Consistencia visual):** El diseño de la tarjeta en `#view-settings` y la barra de navegación superior en `#view-cloud-db` deben mantener idéntica estética a las implementadas para Monedas y Proveedores.
- **RNF-3 (Offline-First y PWA):** Se debe actualizar la versión de caché en `sw.js` (`contapersonal-v28`).
