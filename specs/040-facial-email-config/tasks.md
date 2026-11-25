# Tareas de Implementación — Spec 040

- [ ] **Fase 1: TDD Red:** Crear `tests/facial-email-config.test.js` con pruebas que cubran RF-1, RF-2 y RF-3.
- [ ] **Fase 2: Lógica y Persistencia:**
  - [ ] Implementar funciones puras de verificación de correo en `assets/js/financeCalculations.js`.
  - [ ] Implementar soporte de credenciales biométricas en `assets/js/storage.js`.
  - [ ] Implementar `sendEmailVerification` y `lookupUserData` en `assets/js/dbAdapter.js`.
- [ ] **Fase 3: Interfaz de Usuario y Flujos:**
  - [ ] Renombrar "Base de Datos & Ajustes" a "Configuración" en `index.html` y `assets/js/app.js`.
  - [ ] Añadir botón de Reconocimiento Facial y panel de verificación de correo en `#auth-gate-screen` (`index.html`).
  - [ ] Añadir panel de control de Reconocimiento Facial en la vista de Configuración.
  - [ ] Conectar controladores de eventos en `assets/js/app.js` (Face ID / WebAuthn / Escáner de cámara y verificación de email).
- [ ] **Fase 4: Verificación y Entrega:**
  - [ ] Ejecutar `node --test tests/facial-email-config.test.js` (fase Green).
  - [ ] Ejecutar suite completa `node --test tests/*.test.js` (196/196 pruebas passing).
  - [ ] Actualizar Service Worker a `contapersonal-v23` en `sw.js`.
  - [ ] Actualizar `memory.md`.
  - [ ] Git commit y push a `origin/main`.
