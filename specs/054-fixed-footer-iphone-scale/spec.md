# Spec 054 — Footer Fijo Inferior y Optimización de Escala Visual en iPhone

## 1. Contexto y Problema
En dispositivos móviles (especialmente iPhone / iOS Safari):
1. **Footer no fijo:** El pie de página `#app-footer` se encontraba ubicado al final del contenedor `<main>`, el cual tiene scroll (`overflow-y-auto`). Cuando una vista tiene suficiente contenido (cuentas, movimientos o dashboard), el footer se desplaza al final del contenido y no queda visible en la pantalla a menos que el usuario haga scroll completo hacia abajo.
2. **Escala visual inicial sobredimensionada en iPhone:** Al abrir la aplicación en iPhone, la escala por defecto (16px base) y los tamaños de componentes resultan desproporcionadamente grandes en la pantalla reducida del smartphone, obligando al usuario a pellizcar o reducir el zoom manualmente para obtener una percepción visual equilibrada. Además, los inputs sin escala adecuada provocan que Safari amplíe bruscamente el viewport.

---

## 2. Requerimientos Funcionales (Formato EARS)

### Ubicación y Fijación del Footer
- **RF-1 (Ubicuidad):** El sistema DEBE posicionar `#app-footer` como hijo directo del contenedor principal vertical (después del cierre de `</main>`), manteniendo el header arriba, el contenedor `<main>` scrolleable en el centro y el footer fijo en el fondo de la pantalla sin moverse con el scroll de las vistas.
- **RF-2 (Zona segura iOS):** El sistema DEBE mantener la clase `.footer-safe` y `flex-shrink-0` en `#app-footer`, con padding vertical compacto (`py-2 sm:py-2.5 px-3 sm:px-4`) para convivir con la barra inferior de navegación de iPhone (`env(safe-area-inset-bottom)`).

### Escala Visual y Proporción Móvil
- **RF-3 (Escala base en móvil):** El sistema DEBE definir en `styles.css` una escala tipográfica y de componentes móvil para viewports $\le 640\text{px}$ mediante `html { font-size: 14px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }`, reduciendo proporcionalmente paddings, fuentes, gaps y tarjetas en un 12.5% por defecto en iPhone, replicando la percepción de reducción manual.
- **RF-4 (Blindaje de auto-zoom iOS):** El sistema DEBE estandarizar el tamaño de fuentes de formularios en móvil para impedir auto-zoom forzado por iOS Safari al tocar inputs.
- **RF-5 (Isotipo y bienvenida):** El sistema DEBE dimensionar responsivamente el icono de marca en `#auth-gate-screen` (`w-12 h-12 sm:w-14 sm:h-14`) y contenedor para que la pantalla de inicio se aprecie armónica y nítida.

---

## 3. Criterios de Aceptación
1. Todas las pruebas preexistentes (260) y las nuevas pruebas de la Spec 054 deben pasar al 100%.
2. Al scrollear cualquier vista en móvil o escritorio, el footer permanece inmóvil al pie de la ventana.
3. En resoluciones móviles, la escala de la aplicación es naturalmente compacta sin requerir zoom manual.
