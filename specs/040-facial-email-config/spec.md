# Especificación — Spec 040: Reconocimiento Facial, Validación de Usuario Nuevo por Correo y Renombrado a Configuración

## Contexto del Requerimiento
El usuario ha solicitado tres mejoras sustanciales para la aplicación ContaPersonal:
1. **Habilitar Reconocimiento Facial:** Proporcionar acceso rápido y seguro mediante reconocimiento facial / biometría en el dispositivo del usuario (Face ID en iPhone/iOS Safari, Windows Hello Facial en PC, biometría en Android y escaneo con cámara frontal).
2. **Validación de Usuario Nuevo por Correo Electrónico:** Al crear una cuenta nueva, enviar un correo de verificación al email asociado y requerir la confirmación del enlace antes de conceder acceso a los datos contables.
3. **Renombrar Vista a "Configuración":** Cambiar el título y etiqueta de menú "Base de Datos & Ajustes" a "Configuración".

---

## Requisitos Funcionales (Sintaxis EARS)

### RF-1: Reconocimiento Facial y Autenticación Biométrica
- **Ubicuidad:** El sistema SHALL contar con soporte de credencial biométrica en `Storage` (`getBiometricCredential`, `saveBiometricCredential`, `clearBiometricCredential`).
- **Ubicuidad:** La pantalla de autenticación (`#auth-gate-screen`) SHALL mostrar un botón accesible `#btn-gate-biometric-login` con el texto "Ingresar con Reconocimiento Facial / Face ID" e icono representativo (`scan-face` o `user-check`).
- **Cuando:** El usuario presione `#btn-gate-biometric-login` existiendo una credencial registrada:
  - El sistema SHALL invocar el reconocimiento facial del dispositivo (WebAuthn Platform Authenticator o modal de escáner facial con cámara frontal `#modal-face-scanner`) para autenticar al usuario.
  - **Si:** La verificación facial es aprobada, el sistema SHALL restaurar la sesión y autorizar el acceso inmediato a la aplicación.
  - **Si:** La verificación facial falla o es cancelada, el sistema SHALL mostrar un mensaje de retroalimentación sin comprometer la seguridad.
- **Ubicuidad:** En la vista de Configuración, el sistema SHALL disponer de una tarjeta de gestión biométrica que permita al usuario activar o vincular su reconocimiento facial al dispositivo actual.

### RF-2: Validación de Usuario Nuevo por Correo Electrónico
- **Cuando:** Un nuevo usuario complete el formulario de registro (`isSignUp === true`):
  - El sistema SHALL enviar un correo de verificación a la dirección provista mediante la API de Firebase (`POST /accounts:sendOobCode` con `requestType: "VERIFY_EMAIL"`).
  - El sistema SHALL desplegar un panel informativo en el Gate (`#gate-email-verification-panel`) indicando que se ha enviado un correo de confirmación.
- **Mientras:** El usuario no haya confirmado su correo (`emailVerified !== true`):
  - El sistema SHALL restringir el acceso al contenedor principal de la aplicación.
  - El panel SHALL ofrecer un botón `#btn-check-email-verification` para verificar el estado en tiempo real y `#btn-resend-verification-email` para reenviar el enlace si no lo ha recibido.
- **Ubicuidad:** La función pura `Calculations.puedeAccederApp(authSession, currentTimestampMs, options)` SHALL evaluar la validez de la sesión considerando el estado de verificación de correo.

### RF-3: Renombrar Título "Base de Datos & Ajustes" a "Configuración"
- **Ubicuidad:** El botón de navegación en la barra lateral (`index.html`) con `data-nav-view="settings"` SHALL mostrar la etiqueta de texto `Configuración`.
- **Ubicuidad:** El diccionario de metadatos de vista `VIEW_METADATA.settings` en `assets/js/app.js` SHALL definir `title: "Configuración"`.
- **Cuando:** El usuario navegue a la vista de configuración:
  - El elemento `#page-title` del encabezado SHALL mostrar el texto `Configuración`.
