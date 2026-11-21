# Especificación — Spec 021: Autenticación con Firebase Authentication (Email y Contraseña)

## 1. Visión y Propósito
El objetivo de esta especificación es dotar al sistema de **Contabilidad Personal y Gestión Patrimonial** de un sistema seguro de autenticación de usuarios mediante **Firebase Authentication** utilizando el proveedor de **Correo Electrónico y Contraseña (Email/Password)**.

La implementación operará bajo una arquitectura híbrida **Offline-First**, permitiendo el uso local sin conexión, y sincronizando el patrimonio financiero de manera privada y aislada en Cloud Firestore bajo el identificador único del usuario (`workspaces/{uid}`), garantizando seguridad y confidencialidad mediante reglas de acceso (`firestore.rules`).

---

## 2. Requisitos del Sistema (Formato EARS)

### Requisitos Funcionales (RF)

#### RF-1: Registro de Nuevos Usuarios (Sign Up)
- **Cuando** el usuario envíe el formulario de registro con un correo electrónico válido y una contraseña que cumpla con los estándares mínimos de longitud (al menos 6 caracteres), **el sistema deberá** invocar la API de Firebase Authentication (`accounts:signUp`), crear el usuario en Firebase, retornar su identidad (`uid`, `email`, `idToken`, `refreshToken`) y almacenar la sesión activa localmente.

#### RF-2: Inicio de Sesión de Usuarios Existentes (Sign In)
- **Cuando** el usuario ingrese sus credenciales (correo electrónico y contraseña) en el formulario de inicio de sesión, **el sistema deberá** autenticar contra Firebase Authentication (`accounts:signInWithPassword`), validar la respuesta, actualizar la sesión activa y disparar la sincronización de datos de su workspace personal.

#### RF-3: Manejo Seguro de Tokens y Sesión Persistente
- **Mientras** el usuario mantenga una sesión iniciada, **el sistema deberá** persistir los datos esenciales de autenticación (`uid`, `email`, `idToken`, `refreshToken`, `expiresAt`) en `localStorage` bajo la clave `finance_auth_session`.
- **Si** el `idToken` ha expirado o está próximo a expirar (más de 50 minutos de antigüedad), **el sistema deberá** refrescar automáticamente el token mediante el `refreshToken` a través del endpoint seguro de tokens de Google (`securetoken.googleapis.com`).

#### RF-4: Cierre de Sesión Seguro (Sign Out)
- **Cuando** el usuario presione el botón "Cerrar Sesión", **el sistema deberá** purgar los tokens de sesión de `localStorage`, restablecer el estado de autenticación a "Modo Local / No Autenticado" y notificar al usuario.

#### RF-5: Aislamiento de Datos por UID en Cloud Firestore
- **Mientras** un usuario autenticado tenga sesión activa, **el sistema deberá** leer y escribir su estado contable en la ruta privada `workspaces/{uid}` de Cloud Firestore, enviando el encabezado de autorización `Authorization: Bearer <idToken>`.
- **Si** el usuario no está autenticado, **el sistema deberá** operar exclusivamente en modo local (`localStorage`), sin intentar mutar datos ajenos en la nube.

#### RF-6: Reglas de Seguridad en Cloud Firestore (`firestore.rules`)
- **El sistema deberá** aplicar reglas de seguridad en Cloud Firestore que restrinjan el acceso a `workspaces/{userId}`, permitiendo lectura y escritura única y exclusivamente si `request.auth != null && request.auth.uid == userId`.

#### RF-7: Interfaz de Usuario y Widget de Perfil / Estado de Sesión
- **El sistema deberá** presentar en la cabecera superior y/o barra vertical (`#sidebar`) el estado de sesión:
  - Si no está autenticado: badge "Modo Local" y botón "Iniciar Sesión".
  - Si está autenticado: avatar/icono, email del usuario, estado "Conectado a la Nube" y botón "Cerrar Sesión".
- **Cuando** el usuario haga clic en "Iniciar Sesión", **el sistema deberá** abrir un modal accesible (`#auth-modal`) con pestañas para alternar entre "Iniciar Sesión" y "Crear Cuenta", con validación en vivo de campos y mensajes amigables en español ante errores comunes de Firebase (ej. contraseña incorrecta, correo ya registrado, usuario no encontrado).

---

### Requisitos No Funcionales (RNF)

- **RNF-1: Compatibilidad Universal sin Bundlers:** La autenticación se ejecutará consumiendo la API REST de Google Identity Toolkit, garantizando soporte en cualquier entorno (HTTP/HTTPS y `file:///`) sin dependencias de compiladores pesados ni SDKs externos incompatibles.
- **RNF-2: Seguridad de Credenciales:** Las contraseñas nunca deben almacenarse en texto plano ni persistirse en `localStorage`; solo se almacenan los tokens JWT provistos por Google.
- **RNF-3: Resiliencia Offline:** La falta de conexión a internet o fallos temporales de red no bloquearán la interacción del usuario con sus datos locales ya registrados.
- **RNF-4: Cobertura de Pruebas:** 100% de las funciones puras y validadores de autenticación deben contar con pruebas unitarias ejecutadas mediante `node --test`.
