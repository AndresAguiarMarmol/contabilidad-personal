# Spec 053: Sistema de Licenciamiento Personal Offline y Período de Prueba de 7 Días (Integración Halterofilia)

## Estado
Aprobado por el usuario (Andrés) el 28 de Noviembre de 2026.

## Contexto y Diagnóstico
Para comercializar la aplicación ContaPersonal de forma directa y personal sin pasarelas de pago externas, se requiere un modelo de seguridad y licenciamiento offline compatible con el ecosistema de aplicaciones del desarrollador (específicamente la app servidora "Halterofilia Pro - Administrador de Licencias").
- El primer acceso en cualquier dispositivo debe conceder 7 días continuos de prueba gratuita e ilimitada.
- Al expirar los 7 días sin una licencia válida activa, la aplicación debe presentar un bloqueo no eludible que impida el uso hasta ingresar un Token de Activación criptográfico válido.
- El usuario podrá generar su cadena `REQ|<DeviceID>|<correo>` y solicitar su activación vía WhatsApp al número oficial `+56933395447`.
- La validación del token opera 100% offline mediante Web Crypto API (`crypto.subtle`) verificando la firma SHA-256 contra la sal maestra `"Halterofilia-SuperSecret-Salt-2026"`.

## Requerimientos (EARS)
1. **[R1 - Identificador de Dispositivo y Arranque de Trial]:**
   - Al ejecutarse por primera vez en un dispositivo (sin registro previo), el sistema DEBE generar y persistir un `Device ID` único (`dev_<uuid_o_hash>`) y registrar la marca temporal de inicio `trial_start_date = Date.now()`.
2. **[R2 - Período de Prueba de 7 Días]:**
   - El sistema DEBE permitir acceso irrestricto y gratuito mientras `(Date.now() - trial_start_date) < 604800000 ms` (7 días continuos) o mientras exista un token de licencia válido no expirado.
3. **[R3 - Cadena Canónica de Solicitud]:**
   - El sistema DEBE generar la cadena estandarizada `REQ|<DeviceID>|<correo>` (utilizando el correo autenticado en sesión o uno predeterminado), con botón de copiado en un clic y enlace directo a WhatsApp:
     `https://wa.me/56933395447?text=...`.
4. **[R4 - Validación Criptográfica Offline de Tokens]:**
   - El sistema DEBE recibir tokens codificados en Base64 con payload JSON `{ deviceId, email, exp, signature }`.
   - DEBE verificar que `deviceId` coincida con el dispositivo activo (insensible a mayúsculas/minúsculas).
   - DEBE validar que la fecha de caducidad `exp` no esté vencida (admitiendo `-1` o valores $\ge 9999$ días para licencias vitalicias/perpetuas).
   - DEBE verificar la autenticidad recalculando la firma SHA-256 sobre `${deviceId}|${email}|${exp}|${salt}` con la sal `"Halterofilia-SuperSecret-Salt-2026"` (con tolerancia a delimitadores pipe `|` y dos puntos `:`).
5. **[R5 - Bloqueo No Eludible al Expirar]:**
   - Si han transcurrido más de 7 días y no hay licencia válida, el sistema DEBE presentar un overlay modal `#modal-trial-lock` no eludible (sin tecla Escape, sin botón de cierre, sin scroll de fondo), con la cadena `REQ`, enlace a WhatsApp y formulario para ingresar y validar el Token.
6. **[R6 - Gestión en Configuración e Indicador Visual]:**
   - La cabecera o barra superior DEBE mostrar un badge de estado (ej. `Trial: 5d restantes` o `Licencia Activa`).
   - En Configuración (`#view-settings`) DEBE existir la tarjeta dedicada "Licencia & Activación" para consultar vigencia, copiar la cadena `REQ` o activar anticipadamente.

## Casos de Prueba (TDD)
- Generación de `Device ID` y cálculo exacto de días restantes en trial (7 días iniciales).
- Transición a estado expirado tras 7 días y 1 milisegundo sin licencia.
- Generación y validación exitosa de token firmado compatible con Halterofilia (vitalicia y por días).
- Rechazo de tokens con firma alterada o apócrifa.
- Rechazo de tokens emitidos para otro Device ID.
- Rechazo de tokens expirados en fecha.
- Cero regresiones en los 252 tests contables existentes.
