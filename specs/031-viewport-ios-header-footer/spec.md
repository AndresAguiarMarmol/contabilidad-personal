# Spec 031 — Estabilidad y Visibilidad de Header y Footer en iPhone (iOS Safari)

## Contexto
En dispositivos iPhone (iOS Safari / WebKit), el usuario reportó dos comportamientos críticos:
1. El **Header** superior no es visible o se desplaza fuera del viewport visible.
2. El **Footer** se mueve hacia abajo y queda oculto o inaccesible detrás de las barras dinámicas del navegador y la barra indicadora de inicio (*home indicator*).

El diagnóstico técnico revela:
- Ausencia del atributo `viewport-fit=cover` en la metaetiqueta viewport.
- Altura estática basada en `h-full` / `100%` sin consideración del Dynamic Viewport Height (`100dvh` / `-webkit-fill-available`), provocando que el contenedor de la aplicación exceda el espacio visible cuando las barras de Safari se expanden.
- Falta de respeto de las zonas seguras del hardware (*Safe Area Insets*: `env(safe-area-inset-top)` y `env(safe-area-inset-bottom)`).
- Desborde de ancho acumulado en `<header>` en pantallas móviles estrechas ($\le 390\text{px}$), lo que puede forzar wrapping o recorte de elementos.

---

## Requerimientos Funcionales (EARS)

### RF-1: Meta Viewport con Soporte de Zonas Seguras
- **Ubiquitous:** El archivo `index.html` SHALL incluir `viewport-fit=cover` dentro de la etiqueta `<meta name="viewport" ...>` para permitir a la aplicación ocupar adecuadamente el área de visualización de dispositivos con muescas, Dynamic Island o barras de navegación flotantes.

### RF-2: Altura de Viewport Dinámica (100dvh)
- **Ubiquitous:** Los contenedores principales de la aplicación (`html`, `body`, `#app-container`) SHALL configurar `100dvh` y `-webkit-fill-available` como altura responsiva, de modo que el marco de la aplicación se ajuste exactamente al viewport visible real del navegador en iOS Safari tanto con barras colapsadas como expandidas.

### RF-3: Visibilidad y Zona Segura Superior para Header
- **Event-driven:** WHEN se visualice la aplicación en un dispositivo con área de corte superior (*notch* o Dynamic Island), the system SHALL aplicar relleno superior seguro (`env(safe-area-inset-top)`) al elemento `<header>` mediante la clase `.header-safe` y preservar `flex-shrink-0`, garantizando que la barra superior no quede oculta ni se desplace fuera del área visible.

### RF-4: Ergonomía de Acciones en Header Móvil
- **State-driven:** WHILE la aplicación se renderice en pantallas móviles de ancho reducido ($\le 640\text{px}$), the system SHALL desplegar botones de acción compactos (iconos optimizados para sincronización y nuevo movimiento) para prevenir desbordamientos horizontales o saltos de línea dentro del `<header>`.

### RF-5: Fijación y Zona Segura Inferior para Footer
- **Event-driven:** WHEN el usuario navegue o se desplace al final de cualquier vista en `<main>`, the system SHALL garantizar que `#app-footer` incorpore relleno seguro inferior (`env(safe-area-inset-bottom)`) mediante `.footer-safe` y comportamiento de scroll táctil fluido (`overscroll-behavior-y: contain`), asegurando que el pie de página quede 100% visible y no sea cubierto por la barra de inicio o herramientas de iOS.

---

## Requerimientos No Funcionales (RNF)

- **RNF-1 (Cero Regresiones):** No alterar el comportamiento del sticky footer en PC implementado en Spec 028 ni la identidad visual del header definida en Spec 030.
- **RNF-2 (Compatibilidad Multiplataforma):** Las reglas de `env(safe-area-inset-*)` y `100dvh` deben incluir valores de reserva (*fallbacks*) limpios para navegadores de escritorio y Android.
- **RNF-3 (PWA Offline):** El Service Worker debe actualizarse a una nueva versión para invalidar la caché de estilos y marcado.
