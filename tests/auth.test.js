const test = require("node:test");
const assert = require("node:assert");

const {
  validarCredencialesAuth,
  traducirErrorFirebaseAuth,
  construirPayloadAuth,
  extraerSesionAuth,
  esTokenExpirado
} = require("../assets/js/financeCalculations.js");

test("Spec 021 - RF-1 y RF-2: validarCredencialesAuth valida formato de correo y longitud de contraseña", () => {
  // Correo inválido
  const errEmail = validarCredencialesAuth("correo-invalido", "123456", false);
  assert.strictEqual(errEmail.valida, false);
  assert.ok(errEmail.error.includes("correo electrónico válido"));

  // Contraseña vacía
  const errPassEmpty = validarCredencialesAuth("usuario@ejemplo.com", "", false);
  assert.strictEqual(errPassEmpty.valida, false);
  assert.ok(errPassEmpty.error.includes("contraseña"));

  // Contraseña muy corta en registro (mínimo 6 caracteres)
  const errPassShort = validarCredencialesAuth("usuario@ejemplo.com", "12345", true);
  assert.strictEqual(errPassShort.valida, false);
  assert.ok(errPassShort.error.includes("al menos 6 caracteres"));

  // Credenciales válidas para Sign In
  const okSignIn = validarCredencialesAuth("usuario@ejemplo.com", "miClaveSegura", false);
  assert.strictEqual(okSignIn.valida, true);
  assert.strictEqual(okSignIn.email, "usuario@ejemplo.com");

  // Credenciales válidas para Sign Up
  const okSignUp = validarCredencialesAuth("  usuario@ejemplo.com  ", "miClaveSegura123", true);
  assert.strictEqual(okSignUp.valida, true);
  assert.strictEqual(okSignUp.email, "usuario@ejemplo.com");
});

test("Spec 021 - RNF-1: traducirErrorFirebaseAuth traduce códigos estándar de Firebase a español amigable", () => {
  assert.ok(traducirErrorFirebaseAuth("EMAIL_EXISTS").includes("ya se encuentra registrado"));
  assert.ok(traducirErrorFirebaseAuth("INVALID_LOGIN_CREDENTIALS").includes("Credenciales inválidas"));
  assert.ok(traducirErrorFirebaseAuth("EMAIL_NOT_FOUND").includes("Credenciales inválidas"));
  assert.ok(traducirErrorFirebaseAuth("INVALID_PASSWORD").includes("Credenciales inválidas"));
  assert.ok(traducirErrorFirebaseAuth("WEAK_PASSWORD : Password should be at least 6 characters").includes("al menos 6 caracteres"));
  assert.ok(traducirErrorFirebaseAuth("TOO_MANY_ATTEMPTS_TRY_LATER").includes("Demasiados intentos fallidos"));
  assert.ok(traducirErrorFirebaseAuth("USER_DISABLED").includes("deshabilitada"));

  // Error desconocido devuelve fallback
  assert.ok(traducirErrorFirebaseAuth("UNKNOWN_ERROR_CODE").includes("Error de autenticación"));
});

test("Spec 021 - RF-1 y RF-2: construirPayloadAuth genera los cuerpos REST para SignUp, SignIn y RefreshToken", () => {
  const signUpPayload = construirPayloadAuth("signUp", "test@domain.com", "secret123");
  assert.strictEqual(signUpPayload.email, "test@domain.com");
  assert.strictEqual(signUpPayload.password, "secret123");
  assert.strictEqual(signUpPayload.returnSecureToken, true);

  const signInPayload = construirPayloadAuth("signIn", "test@domain.com", "secret123");
  assert.strictEqual(signInPayload.email, "test@domain.com");
  assert.strictEqual(signInPayload.password, "secret123");
  assert.strictEqual(signInPayload.returnSecureToken, true);

  const refreshPayload = construirPayloadAuth("refresh", null, null, "sample-refresh-token");
  assert.strictEqual(refreshPayload.grant_type, "refresh_token");
  assert.strictEqual(refreshPayload.refresh_token, "sample-refresh-token");
});

test("Spec 021 - RF-3: extraerSesionAuth construye objeto de sesión con expiresAt en timestamp milisegundos", () => {
  const fakeApiResponse = {
    localId: "UID-123456",
    email: "usuario@ejemplo.com",
    idToken: "jwt.fake.token",
    refreshToken: "fake-refresh-token",
    expiresIn: "3600"
  };

  const nowMs = 1700000000000;
  const sesion = extraerSesionAuth(fakeApiResponse, nowMs);

  assert.strictEqual(sesion.uid, "UID-123456");
  assert.strictEqual(sesion.email, "usuario@ejemplo.com");
  assert.strictEqual(sesion.idToken, "jwt.fake.token");
  assert.strictEqual(sesion.refreshToken, "fake-refresh-token");
  // 3600 segundos = 3.600.000 ms -> nowMs + 3.600.000
  assert.strictEqual(sesion.expiresAt, nowMs + 3600000);
});

test("Spec 021 - RF-3: esTokenExpirado detecta tokens vencidos o próximos a expirar", () => {
  const nowMs = 1700000000000;

  // Sesión nula o sin token -> expirado
  assert.strictEqual(esTokenExpirado(null, nowMs), true);
  assert.strictEqual(esTokenExpirado({}, nowMs), true);

  // Token que vence en 10 minutos (600s), umbral de anticipación por defecto (300s = 5 min) -> NO expirado
  const sesionVigente = {
    idToken: "token-vigente",
    expiresAt: nowMs + 600000
  };
  assert.strictEqual(esTokenExpirado(sesionVigente, nowMs, 300), false);

  // Token que vence en 2 minutos (120s), pero umbral es 5 minutos (300s) -> SÍ requiere refresco (expirado)
  const sesionPorVencer = {
    idToken: "token-por-vencer",
    expiresAt: nowMs + 120000
  };
  assert.strictEqual(esTokenExpirado(sesionPorVencer, nowMs, 300), true);

  // Token ya vencido hace 1 hora
  const sesionVencida = {
    idToken: "token-vencido",
    expiresAt: nowMs - 3600000
  };
  assert.strictEqual(esTokenExpirado(sesionVencida, nowMs), true);
});
