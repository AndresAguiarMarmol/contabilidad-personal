# Plan de Implementación — Spec 040

## Arquitectura y Módulos Afectados

1. **Lógica Pura (`assets/js/financeCalculations.js`):**
   - Actualizar `puedeAccederApp(authSession, currentTimestampMs, options)` para soportar la validación condicional de correo electrónico (`requireEmailVerification`).
   - Crear función pura `construirPayloadEmailVerification(idToken)` para serializar la solicitud de envío de correo de verificación.
   - Crear función pura `validarEstadoVerificacionUsuario(userData)` para normalizar el indicador `emailVerified`.

2. **Persistencia Local (`assets/js/storage.js`):**
   - Incorporar `BIOMETRIC_CREDENTIAL: "finance_biometric_credential"` en `STORAGE_KEYS`.
   - Implementar `getBiometricCredential()`, `saveBiometricCredential(cred)`, `clearBiometricCredential()`.
   - Limpiar y aislar de forma segura credenciales biométricas locales.

3. **Adaptador de Base de Datos y Auth (`assets/js/dbAdapter.js`):**
   - Implementar `sendEmailVerification(idToken, config)`: Llama a `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode` con `requestType: "VERIFY_EMAIL"`.
   - Implementar `lookupUserData(idToken, config)`: Llama a `https://identitytoolkit.googleapis.com/v1/accounts:lookup` para comprobar si `emailVerified === true`.
   - En `signUpUser`: Tras crear la cuenta con éxito, llamar inmediatamente a `sendEmailVerification` y retornar `requiresVerification: true`.

4. **Interfaz y Flujos de Usuario (`index.html` y `assets/js/app.js`):**
   - En `index.html`:
     - Cambiar `<span>Base de Datos & Ajustes</span>` por `<span>Configuración</span>`.
     - Añadir botón de Reconocimiento Facial en el Auth Gate (`#btn-gate-biometric-login`).
     - Añadir panel de Verificación de Correo en el Auth Gate (`#gate-email-verification-panel`).
     - Añadir tarjeta de "Reconocimiento Facial & Biometría" en la vista de Configuración.
   - En `assets/js/app.js`:
     - Actualizar `VIEW_METADATA.settings.title = "Configuración"`.
     - Implementar flujo de Reconocimiento Facial: WebAuthn con soporte de Face ID / Windows Hello / biometría del dispositivo, y modal con cámara frontal con guía de rostro holográfica.
     - Implementar eventos de verificación de correo y reenvío.

5. **Aseguramiento de Calidad (TDD):**
   - Crear suite de pruebas unitarias en `tests/facial-email-config.test.js`.
   - Verificar 100% verde (target: 196/196 pruebas totales).
   - Bump de caché en `sw.js` a `contapersonal-v23`.
   - Actualizar `memory.md`.
