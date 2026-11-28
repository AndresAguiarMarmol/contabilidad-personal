const { test } = require('node:test');
const assert = require('node:assert/strict');
const License = require('../assets/js/license.js');

test('Spec 053 - R1 & R3: generarCadenaSolicitud genera formato canónico REQ|DeviceID|correo', () => {
  const req = License.generarCadenaSolicitud("dev_abc123", "usuario@gmail.com");
  assert.equal(req, "REQ|dev_abc123|usuario@gmail.com");
});

test('Spec 053 - R2: obtenerEstadoLicencia reconoce período de prueba activo de 7 días', () => {
  const now = Date.now();
  const trialStartDate = now - (2 * 24 * 60 * 60 * 1000); // 2 días de uso

  const estado = License.obtenerEstadoLicencia({
    deviceId: "dev_test_1",
    trialStartDate,
    licenseToken: null,
    now
  });

  assert.equal(estado.activo, true, "El acceso debe estar activo");
  assert.equal(estado.esTrial, true, "Debe ser modo trial");
  assert.equal(estado.diasRestantes, 5, "Deben restar 5 días");
});

test('Spec 053 - R2 & R5: obtenerEstadoLicencia bloquea el acceso si pasaron más de 7 días sin licencia', () => {
  const now = Date.now();
  const trialStartDate = now - (8 * 24 * 60 * 60 * 1000); // 8 días de uso (expirado)

  const estado = License.obtenerEstadoLicencia({
    deviceId: "dev_test_1",
    trialStartDate,
    licenseToken: null,
    now
  });

  assert.equal(estado.activo, false, "El acceso debe estar bloqueado");
  assert.equal(estado.esTrial, true);
  assert.equal(estado.expirado, true, "Debe reportar expirado");
  assert.equal(estado.diasRestantes, 0);
});

test('Spec 053 - R4: validarTokenLicencia valida token perpetuo compatible con Halterofilia', async () => {
  const deviceId = "dev_123456";
  const email = "andres@gmail.com";

  // Token perpetuo generado con la sal maestra
  const token = await License.generarTokenLicencia(deviceId, email, -1);

  const res = await License.validarTokenLicencia(token, deviceId);
  assert.equal(res.valido, true, "El token debe ser válido");
  assert.equal(res.payload.deviceId, deviceId);
  assert.equal(res.payload.email, email);
  assert.equal(res.payload.isPerpetual, true);
});

test('Spec 053 - R4: validarTokenLicencia valida token temporal válido por 30 días', async () => {
  const deviceId = "dev_iphone_1";
  const email = "cliente@gmail.com";

  const token = await License.generarTokenLicencia(deviceId, email, 30);

  const res = await License.validarTokenLicencia(token, deviceId);
  assert.equal(res.valido, true);
  assert.equal(res.payload.isPerpetual, false);
  assert.ok(res.payload.exp > Date.now());
});

test('Spec 053 - R4: validarTokenLicencia rechaza token emitido para otro dispositivo', async () => {
  const token = await License.generarTokenLicencia("dev_pc_1", "andres@gmail.com", -1);

  const res = await License.validarTokenLicencia(token, "dev_celular_2");
  assert.equal(res.valido, false);
  assert.ok(res.error.includes("otro dispositivo"));
});

test('Spec 053 - R4: validarTokenLicencia rechaza token con firma alterada', async () => {
  const deviceId = "dev_safe";
  const email = "test@gmail.com";
  const token = await License.generarTokenLicencia(deviceId, email, -1);

  // Manipular el JSON del token
  const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
  decoded.exp = 9999999999999; // alteración
  const tamperedToken = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64');

  const res = await License.validarTokenLicencia(tamperedToken, deviceId);
  assert.equal(res.valido, false);
  assert.ok(res.error.includes("Firma criptográfica inválida") || res.error.includes("alterado"));
});
