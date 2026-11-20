# Especificación — Spec 020: Módulo de Reportes Financieros (Balance General y Estado de Ganancias y Pérdidas)

## Contexto y Alcance
La aplicación requiere un menú de Reportes Financieros accesible desde la barra vertical de navegación (`sidebar`).
El módulo presentará los dos estados financieros fundamentales conforme a las prácticas contables y la legislación en Chile adaptada a la gestión personal/patrimonial:
1. **Balance General Clasificado (Estado de Situación Financiera):** Presenta la posición patrimonial consolidada (Activos Circulantes, Activos Fijos, Pasivos Circulantes, Pasivos Largo Plazo y Patrimonio Neto con Resultado del Ejercicio), verificando la ecuación contable: $\text{Total Activos} = \text{Total Pasivos} + \text{Total Patrimonio Neto}$.
2. **Estado de Ganancias y Pérdidas (Estado de Resultados):** Presenta los Ingresos y Gastos operacionales y financieros del período contable seleccionado, determinando el Resultado Neto del Ejercicio (Superávit o Déficit).

Los reportes se consolidan en moneda base `CLP` con valorización transparente de cuentas en moneda extranjera según la tasa de cambio vigente (Spec 018), admiten filtros de período (Mes Actual por defecto, Año Comercial Completo y Personalizado) y cuentan con exportación a CSV e impresión ejecutiva apta para PDF.

## Requisitos en Formato EARS

### Requisito 1: Navegación del Menú de Reportes en la Barra Vertical (Ubiquitous)
El sistema **deberá** proveer un botón de acceso directo "Reportes" (`data-nav-view="reports"`) en la barra vertical de navegación con icono de reporte contable (`file-bar-chart` o `bar-chart-3`), visible e interactivo en versiones de escritorio y móviles.

### Requisito 2: Balance General Clasificado (Ubiquitous)
El sistema **deberá** estructurar el Balance General Clasificado separando:
- **Activos:**
  - *Activo Circulante / Disponible:* Cuentas bancarias, efectivo, billeteras y ahorros líquidos (Clases 1.1 y 1.2).
  - *Activos Fijos / Bienes Patrimoniales:* Inmuebles, vehículos, tecnología y mobiliario (Clase 1.3).
- **Pasivos:**
  - *Pasivo Circulante / Corto Plazo:* Tarjetas de crédito, sobregiros y préstamos familiares (Clase 2.1).
  - *Pasivo a Largo Plazo:* Créditos hipotecarios y de largo plazo (Clase 2.2).
- **Patrimonio Neto:**
  - *Capital y Ahorro Acumulado:* Fondos históricos de capital (Clase 3.1 y 3.2).
  - *Resultado del Ejercicio:* Utilidad o pérdida neta acumulada en el período.
- **Cuadratura:** Comprobación estricta de la igualdad $\text{Total Activos} = \text{Total Pasivos} + \text{Total Patrimonio}$.

### Requisito 3: Estado de Ganancias y Pérdidas (Ubiquitous)
El sistema **deberá** estructurar el Estado de Resultados discriminando:
- **Ingresos del Período:** Ingresos laborales (sueldos, honorarios) y rendimientos/otros ingresos (Clase 4).
- **Gastos del Período:** Gastos de consumo y vida personal (vivienda, alimentación, movilidad, salud, educación, ocio) y gastos financieros (intereses y comisiones bancarias) (Clase 5).
- **Resultado del Período:** Cálculo del Superávit o Déficit ($\text{Total Ingresos} - \text{Total Gastos}$).

### Requisito 4: Filtros de Período Contable (Event-Driven)
**Cuando** el usuario seleccione un período temporal en el menú de reportes, el sistema **deberá** recalcular en vivo los estados financieros para:
- "Mes Actual" (período predeterminado).
- "Año Comercial Completo" (ejercicio de enero a diciembre del año en curso).
- "Rango Personalizado" (fechas desde y hasta seleccionables por el usuario).

### Requisito 5: Consolidación Multidivisa en CLP (State-Driven)
**Mientras** existan cuentas financieras con saldos en moneda extranjera (USD, EUR, ARS), el sistema **deberá** convertirlas a CLP aplicando la tasa de cambio referente vigente de `currencies`, e incluir una nota contable informativa al pie con las tasas de cambio empleadas.

### Requisito 6: Exportación CSV e Impresión PDF (Event-Driven)
**Cuando** el usuario haga clic en:
- "Exportar CSV": el sistema **deberá** descargar un archivo CSV estructurado con cabecera BOM (`\uFEFF`) y el contenido completo del reporte activo.
- "Imprimir / PDF": el sistema **deberá** activar el diálogo de impresión del navegador (`window.print()`) con una hoja de estilo optimizada de presentación ejecutiva limpia (ocultando barras de navegación y controles de interfaz).
