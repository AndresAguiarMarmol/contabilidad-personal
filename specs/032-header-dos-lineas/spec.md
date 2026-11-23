# Spec 032 — Header de Aplicación en 2 Líneas

## Contexto
En dispositivos móviles como iPhone, el usuario reporta que el header aún no se visualiza de forma completa y solicita explícitamente:
*"separa en 2 lineas el contenido de este"*

Al condensar la marca institucional (*ContaPersonal — Finanzas Personales*), el widget de autenticación, el título de la vista y las acciones rápidas (Sincronizar, Nuevo Movimiento y Menú) en una sola fila horizontal, el espacio en pantallas de $\le 390\text{px}$ resulta insuficiente, provocando recortes y falta de visibilidad.

La solución estructurada consiste en organizar `<header>` en 2 líneas o filas claramente diferenciadas:
1. **Línea 1 (Superior):** Identidad corporativa de la marca (*ContaPersonal — Finanzas Personales*) a la izquierda, y widget de sesión/usuario (`#auth-user-widget`) a la derecha.
2. **Línea 2 (Inferior):** Contexto y título de la pantalla activa (`#page-title` y `#page-subtitle`) a la izquierda, y barra de acciones rápidas (`#btn-quick-sync`, `#btn-quick-new-tx` y `#btn-open-sidebar` de navegación) a la derecha.

---

## Requerimientos Funcionales (EARS)

### RF-1: Estructura de Dos Líneas en Header
- **Ubiquitous:** El elemento `<header>` SHALL estructurarse como un contenedor flex en columna (`flex flex-col`) compuesto por dos filas horizontales independientes (`w-full flex items-center justify-between`).

### RF-2: Línea 1 — Identidad de Marca y Usuario
- **Ubiquitous:** La primera fila del `<header>` SHALL alojar a la izquierda el logotipo de la billetera y el texto institucional "ContaPersonal" con subtítulo "Finanzas Personales", y a la derecha el contenedor `#auth-user-widget`.

### RF-3: Línea 2 — Título de Vista Activa y Acciones
- **Ubiquitous:** La segunda fila del `<header>` SHALL alojar a la izquierda los identificadores de contexto `#page-title` y `#page-subtitle` (visibles sin requerir pantallas ultraanchas), y a la derecha los botones de acción rápida `#btn-quick-sync`, `#btn-quick-new-tx` y el botón de menú `#btn-open-sidebar`.

### RF-4: Preservación de Zonas Seguras y Compatibilidad
- **Ubiquitous:** El `<header>` SHALL mantener la clase `.header-safe` y `flex-shrink-0`, adaptando su altura dinámica para que ambas filas sean 100% visibles y accesibles en iPhone tanto en modo claro como oscuro.

---

## Requerimientos No Funcionales (RNF)

- **RNF-1 (Cero Regresiones):** Todos los IDs funcionales del DOM (`page-title`, `page-subtitle`, `auth-user-widget`, `btn-quick-sync`, `btn-quick-new-tx`, `btn-open-sidebar`) y el orden relativo requerido por las suites de pruebas de Spec 030 y Spec 031 deben mantenerse estrictamente.
- **RNF-2 (Ergonomía Táctil):** Ambas filas deben contar con separación vertical limpia (`gap-1.5` a `gap-2`) y divisores sutiles que faciliten la interacción táctil en smartphones.
