# Plan Técnico — Spec 021: Firebase Authentication (Email/Password)

## 1. Arquitectura Técnica de Autenticación REST

Para mantener la compatibilidad con el ecosistema PWA sin bundler y garantizar funcionamiento universal (tanto en servidor web como en apertura local `file:///` y pruebas en Node.js), la autenticación se implementará consumiendo los endpoints REST oficiales de **Google Identity Toolkit v1**:

### Endpoints Clave:
1. **Registro (Sign Up):**
   - `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}`
   - Body: `{ email, password, returnSecureToken: true }`
   - Retorna: `{ idToken, email, refreshToken, expiresIn, localId }`
2. **Inicio de Sesión (Sign In):**
   - `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}`
   - Body: `{ email, password, returnSecureToken: true }`
   - Retorna: `{ idToken, email, refreshToken, expiresIn, localId, registered: true }`
3. **Refresco de Token:**
   - `POST https://securetoken.googleapis.com/v1/token?key={API_KEY}`
   - Body: `{ grant_type: "refresh_token", refresh_token: refreshToken }`
   - Retorna: `{ id_token, refresh_token, expires_in, user_id }`

---

## 2. Manejo de Errores Traducidos al Español

Se implementará una función pura `traducirErrorFirebaseAuth(errorCode)` para mapear códigos de error estándar de Firebase a mensajes amigables:
- `EMAIL_EXISTS`: "El correo electrónico ya se encuentra registrado. Intenta iniciar sesión."
- `EMAIL_NOT_FOUND` / `INVALID_LOGIN_CREDENTIALS` / `INVALID_PASSWORD`: "Credenciales inválidas. Verifica tu correo y contraseña."
- `WEAK_PASSWORD : ...`: "La contraseña es muy débil. Debe tener al menos 6 caracteres."
- `INVALID_EMAIL`: "El formato de correo electrónico no es válido."
- `USER_DISABLED`: "Esta cuenta de usuario ha sido deshabilitada."
- `TOO_MANY_ATTEMPTS_TRY_LATER`: "Demasiados intentos fallidos. Intenta más tarde."

---

## 3. Adaptador de Persistencia y Seguridad en Firestore

1. **En `assets/js/storage.js`:**
   - Métodos `getAuthSession()`, `saveAuthSession(sessionData)`, `clearAuthSession()`.
   - Clave `localStorage`: `finance_auth_session`.
2. **En `assets/js/dbAdapter.js`:**
   - Funciones:
     - `signUpUser(email, password, config)`
     - `signInUser(email, password, config)`
     - `refreshUserToken(refreshToken, config)`
     - `getValidAuthToken(config)`: verifica expiración y refresca si es necesario antes de contactar Firestore.
   - Actualización de `fetchRemoteWorkspace` y `saveRemoteWorkspace`:
     - Determinar ruta del documento: `workspaces/${session.uid}` si hay sesión activa, o `workspaces/main` (fallback si no hay auth pero está en modo global).
     - Si hay sesión activa, enviar header: `Authorization: Bearer ${token}`.
3. **En `firestore.rules`:**
   - Delegar a subagente `firestore-rules-author` la actualización y verificación de reglas de seguridad para restringir `workspaces/{userId}` a `request.auth.uid == userId`.

---

## 4. Diseño de Interfaz de Usuario (UI/UX)

1. **Widget de Sesión en la Cabecera:**
   - Posicionado en el Header superior (`<header>`):
     - Botón "Iniciar Sesión" (cuando no está autenticado).
     - Menú de perfil de usuario con avatar, email y botón desplegable "Cerrar Sesión" (cuando está autenticado).
2. **Modal de Autenticación (`#auth-modal`):**
   - Modal moderno con dos tabs ("Iniciar Sesión" y "Crear Cuenta").
   - Campos de correo electrónico y contraseña (con botón para alternar visibilidad de contraseña).
   - Indicador de carga (spinner en botón) y área de feedback para mensajes de error o éxito.
   - Transición automática al iniciar sesión exitosamente con sincronización reactiva en tiempo real.

---

## 5. Estrategia de Pruebas TDD (`tests/auth.test.js`)
- Test 1: Validación sintáctica de email y contraseña (funciones puras).
- Test 2: Traducción correcta y comprensible de códigos de error de Firebase Authentication a español.
- Test 3: Construcción de payloads REST para SignUp, SignIn y RefreshToken.
- Test 4: Mapeo y extracción de sesión de usuario desde respuestas válidas de Firebase Auth.
- Test 5: Detección y lógica de expiración de token para refresco automático.
