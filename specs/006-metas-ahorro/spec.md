# Spec 006 — Gestión de Metas de Ahorro Personal

Estado: implementada

## 1. Contexto y Objetivo
El ahorro intencional hacia metas concretas (ej. Fondo de Emergencia de 6 meses, Vacaciones, Educación, Pie de Vivienda) es una piedra angular de la salud financiera personal. Actualmente, la aplicación visualiza metas de ahorro de demostración en la sección "Presupuestos & Metas", pero el botón "Nueva Meta" (`btn-modal-new-goal`) muestra un marcador de posición sin interactividad.

El objetivo de esta especificación es implementar la gestión completa de Metas de Ahorro:
- Planilla interactiva para crear y editar metas de ahorro (título, monto objetivo, monto ahorrado inicial, fecha límite y color identificador).
- Registro de aportes monetarios a las metas de ahorro existentes.
- Cálculo de progreso porcentual, monto restante y alertas de meta cumplida.
- Capacidad de editar y eliminar metas de ahorro con persistencia local en `Storage`.

---

## 2. Usuarios y Historias de Usuario
- **HU-1:** Como usuario, quiero crear una meta de ahorro con su monto objetivo y fecha límite para tener claridad de cuánto necesito ahorrar.
- **HU-2:** Como usuario, quiero registrar aportes a mis metas de ahorro para ver cómo se incrementa el porcentaje de avance hacia mi objetivo.
- **HU-3:** Como usuario, quiero que el sistema me felicite cuando alcance el 100% de una meta y me indique cuánto dinero me falta cuando esté en progreso.
- **HU-4:** Como usuario, quiero editar las condiciones de una meta (título, monto objetivo, fecha) o eliminarla si ya no está vigente.

---

## 3. Requisitos Funcionales (EARS)
- **RF-1 (Evento):** CUANDO el usuario hace clic en "Nueva Meta" (`btn-modal-new-goal`) o en el botón de edición de una meta existente, EL SISTEMA abre la planilla modal con los campos de Título, Monto Objetivo ($), Monto Ahorrado Inicial ($), Fecha Límite y Color.
- **RF-2 (Estado no deseado):** SI el usuario intenta guardar una meta con título vacío o con un monto objetivo menor o igual a cero, ENTONCES EL SISTEMA bloquea el guardado y destaca el error correspondiente.
- **RF-3 (Comportamiento continuo):** EL SISTEMA calcula reactivamente el progreso de cada meta:
  - Porcentaje de avance ($\text{pct} = \min(100, \text{round}((\text{actual} / \text{objetivo}) \times 100))$).
  - Monto faltante ($\text{faltante} = \max(0, \text{objetivo} - \text{actual})$).
  - Estado de cumplimiento: `¡Meta Cumplida! 🏆` cuando $\text{actual} \ge \text{objetivo}$.
- **RF-4 (Evento):** CUANDO el usuario hace clic en "+ Aportar" en una tarjeta de meta, EL SISTEMA despliega una ventana modal rápida para ingresar el monto a depositar/sumar, incrementando atómicamente el saldo ahorrado de la meta.
- **RF-5 (Evento):** CUANDO el usuario elimina una meta de ahorro, EL SISTEMA la retira de la lista y persiste los cambios sin alterar los saldos de las cuentas bancarias.

---

## 4. Requisitos No Funcionales
- **RNF-1:** Persistencia completa en `localStorage` bajo la clave `finance_goals_data`.
- **RNF-2:** Lógica matemática pura desacoplada y probada al 100% mediante `node --test`.
- **RNF-3:** Actualización reactiva e inmediata del Dashboard y de la vista "Presupuestos & Metas".

---

## 5. Casos Límite y Manejo de Errores
- Monto aportado igual a cero o negativo: El sistema bloquea aportes que no sean números positivos.
- Monto acumulado supera el monto objetivo: El porcentaje se muestra al 100% (o valor exacto si se supera) con insignia de logro cumplido.
- Sin fecha límite: Si el usuario no ingresa fecha límite, la meta se gestiona como objetivo abierto sin vencimiento.

---

## 6. Criterios de Finalización (DoD)
- [x] Planilla modal funcional al pulsar "+ Nueva Meta" (`btn-modal-new-goal`).
- [x] Validación de título y monto objetivo mayor a cero.
- [x] Modal de aporte rápido "+ Aportar" en cada tarjeta de meta.
- [x] Lógica pura (`validarMetaAhorro`, `calcularProgresoMeta`, `aplicarAporteMeta`) cubierta con pruebas unitarias en `node --test`.
- [x] Tarjetas de meta con barra de progreso, porcentaje, monto faltante/cumplido y botones de aporte, edición y eliminación.
- [x] Persistencia y sincronización garantizadas en `Storage.saveGoals()`.
- [x] Verificación en navegador mediante Chrome DevTools con 0 errores de consola.
