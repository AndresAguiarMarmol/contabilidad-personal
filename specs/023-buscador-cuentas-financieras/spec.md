# Especificación Funcional — Spec 023: Buscador y Filtro de Cuentas Financieras, Billeteras y Tarjetas

**Estado:** Aprobada  
**Fecha:** 2026-11-22  
**Autor:** Ana (Coordinadora SDD)

---

## 1. Propósito y Contexto de Negocio
En la vista principal de tesorería "Cuentas Bancarias, Billeteras y Tarjetas", el usuario administra todas sus fuentes de dinero (cuentas corrientes, cajas de ahorro, billeteras digitales, efectivo y tarjetas de crédito). A medida que el usuario añade múltiples cuentas en diferentes instituciones y monedas, necesita localizar rápidamente una cuenta específica sin desplazarse visualmente por toda la cuadrícula. Se habilita una barra de búsqueda y filtrado interactivo siempre visible en la cabecera de la sección que permite filtrar en tiempo real por nombre de cuenta, tipo de cuenta o divisa.

---

## 2. Historias de Usuario

- **HU-1 (Búsqueda en tiempo real):** Como usuario de la contabilidad personal, quiero disponer de una barra con botón de búsqueda siempre visible en la sección de Cuentas & Billeteras para encontrar de inmediato una cuenta por su nombre, banco o divisa.
- **HU-2 (Filtrado reactivo):** Como usuario, quiero que la cuadrícula de cuentas se actualice instantáneamente a medida que escribo en el campo de búsqueda, mostrando solo las cuentas que coincidan con el texto ingresado.
- **HU-3 (Limpieza de búsqueda):** Como usuario, quiero poder borrar el término de búsqueda con un solo clic o vaciando el campo para restaurar la vista completa de todas mis cuentas.
- **HU-4 (Estado sin resultados):** Como usuario, quiero recibir un mensaje claro cuando ninguna cuenta coincida con el criterio de búsqueda, con la opción de restablecer la búsqueda inmediatamente.

---

## 3. Requisitos Funcionales (Sintaxis EARS)

### RF-1: Barra de búsqueda siempre visible (Ubicuo)
El sistema debe presentar un campo de texto con icono de lupa permanentemente visible en la cabecera de la sección "Cuentas Bancarias, Billeteras y Tarjetas", alineado armónicamente con el título y el botón de creación de nueva cuenta.

### RF-2: Filtrado en tiempo real insensible a mayúsculas y acentos (Event-driven)
Cuando el usuario escribe un término en el campo de búsqueda, el sistema debe filtrar de inmediato la lista de cuentas mostradas, reteniendo aquellas cuyo nombre, tipo de cuenta (banco, efectivo, billetera, ahorro, tarjeta) o código de moneda contenga la cadena buscada de manera insensible a mayúsculas, minúsculas y tildes.

### RF-3: Restauración completa de la lista (Event-driven)
Cuando el usuario borra el texto de búsqueda o presiona el botón de limpiar búsqueda, el sistema debe restablecer la cuadrícula mostrando la totalidad de las cuentas financieras activas.

### RF-4: Manejo de estado sin coincidencias (State-driven)
Mientras el término de búsqueda no coincida con ninguna cuenta activa, el sistema debe ocultar la cuadrícula y desplegar un panel informativo indicando que no hay cuentas que coincidan con el criterio ingresado, ofreciendo un botón para limpiar el filtro.

### RF-5: Preservación de operaciones sobre cuentas filtradas (Ubicuo)
El sistema debe permitir hacer clic en cualquier tarjeta de cuenta resultante de la búsqueda para ingresar a su detalle de movimientos, así como ejecutar sus acciones de edición y eliminación sin perder la coherencia contable.

---

## 4. Requisitos No Funcionales y Restricciones

- **RNF-1 (Respuesta inmediata):** El filtrado en pantalla debe ejecutarse en menos de 50 milisegundos sin recargar la página.
- **RNF-2 (Ergonomía móvil):** En pantallas móviles y táctiles, el buscador debe ser completamente accesible, responsive y cómodo para el teclado en pantalla.
- **RNF-3 (Cero dependencias externas):** La lógica de filtrado debe implementarse mediante una función pura desacoplada en el módulo de cálculos financieros, probada con el ejecutor nativo de pruebas.

---

## 5. Casos Límite y Consideraciones de Borde

1. **Búsqueda con espacios en blanco al inicio o al final:** El sistema debe normalizar y recortar los espacios para no arrojar resultados vacíos erróneos.
2. **Búsqueda con caracteres especiales o tildes:** Buscar "banco", "Banco" o "bancó" debe coincidir con "Banco de Chile". Buscar "crédito" o "credito" debe coincidir con cuentas de tipo tarjeta de crédito.
3. **Lista de cuentas vacía:** Si el usuario no tiene ninguna cuenta creada aún, el buscador debe permanecer neutral sin interferir con la pantalla de bienvenida.
4. **Búsqueda por divisa:** Escribir "USD", "CLP", "EUR" o "ARS" debe filtrar las cuentas asociadas a esa moneda.
