/**
 * license.js — Sistema de Licenciamiento y Seguridad Offline (Zero-Knowledge)
 * Período de Prueba de 7 días, validación criptográfica de tokens y bloqueo estricto offline.
 * Compatible con la App servidora "Halterofilia Pro - Administrador de Licencias" (Spec 053).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LicenseManager = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Constantes maestras de licenciamiento (Ecosistema Halterofilia)
  const TRIAL_DAYS = 7;
  const TRIAL_DURATION_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000; // 604,800,000 ms
  const LICENSE_SALT = "Halterofilia-SuperSecret-Salt-2026";
  const CONTACT_PHONE = "+56933395447";

  /**
   * Genera un identificador único persistente para el dispositivo
   * @returns {string} Formato dev_<uuid>
   */
  function generarDeviceId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    }
    const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    return `dev_${Date.now().toString(36)}_${rand}`;
  }

  /**
   * Genera la cadena canónica de solicitud de activación
   * Formato: REQ|<DeviceID>|<correo>
   * @param {string} deviceId 
   * @param {string} email 
   * @returns {string}
   */
  function generarCadenaSolicitud(deviceId, email) {
    const dId = (deviceId || 'dev_unknown').trim().toLowerCase();
    const mail = (email || 'usuario@contapersonal.cl').trim().toLowerCase();
    return `REQ|${dId}|${mail}`;
  }

  /**
   * Genera el enlace directo a WhatsApp con el mensaje de solicitud precargado
   * Soporta tanto cadenaSolicitud ("REQ|...") como (deviceId, email)
   * @param {string} cadenaSolicitudOrDeviceId 
   * @param {string} [email] 
   * @returns {string} URL https://wa.me/...
   */
  function generarEnlaceWhatsApp(cadenaSolicitudOrDeviceId, email) {
    let reqString = cadenaSolicitudOrDeviceId;
    if (email !== undefined || (typeof reqString === "string" && !reqString.startsWith("REQ|"))) {
      reqString = generarCadenaSolicitud(cadenaSolicitudOrDeviceId, email);
    }
    const cleanPhone = CONTACT_PHONE.replace(/[^0-9]/g, '');
    const mensaje = `Hola Andres, solicito la activacion de mi licencia de ContaPersonal:\n\n${reqString}\n\nMuchas gracias!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
  }

  /**
   * Computa el hash SHA-256 de una cadena UTF-8
   * Soporta entorno Node.js (crypto) y Navegador (crypto.subtle)
   * @param {string} rawStr
   * @returns {Promise<string>} Hash hexadecimal de 64 caracteres
   */
  async function computarHashSHA256(rawStr) {
    // Entorno Node.js (Pruebas unitarias)
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const cryptoNode = require('node:crypto');
        return cryptoNode.createHash('sha256').update(rawStr, 'utf8').digest('hex');
      } catch (e) {
        // Fallback a Web Crypto
      }
    }

    // Entorno Navegador (Web Crypto API)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(rawStr);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback matemático básico si no hay crypto
    let hash = 0;
    for (let i = 0; i < rawStr.length; i++) {
      hash = (hash << 5) - hash + rawStr.charCodeAt(i);
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }

  /**
   * Computa la firma criptográfica SHA-256 de un payload de licencia
   * Concatenación canónica: "${deviceId}|${email}|${exp}|${salt}"
   * @param {string} deviceId 
   * @param {string} email 
   * @param {number|string} exp Timestamp de expiración o -1 para licencia perpetua
   * @param {string} [salt] Sal maestra
   * @param {string} [delimiter] Delimitador (| o :)
   * @returns {Promise<string>} Hash hexadecimal SHA-256
   */
  async function computarFirmaLicencia(deviceId, email, exp, salt = LICENSE_SALT, delimiter = '|') {
    const dId = (deviceId || '').trim().toLowerCase();
    const mail = (email || '').trim().toLowerCase();
    const expVal = (exp !== undefined && exp !== null) ? exp.toString().trim() : '-1';
    const canonicalData = `${dId}${delimiter}${mail}${delimiter}${expVal}${delimiter}${salt}`;
    return await computarHashSHA256(canonicalData);
  }

  /**
   * Genera un token de activación codificado en Base64 con firma SHA-256 (Servidor Halterofilia)
   * @param {string} deviceId 
   * @param {string} email 
   * @param {number} [diasValidez=365] Días de validez (-1 para vitalicia/perpetua)
   * @param {string} [salt]
   * @returns {Promise<string>} Token en Base64
   */
  async function generarTokenLicencia(deviceId, email, diasValidez = 365, salt = LICENSE_SALT) {
    const dId = (deviceId || '').trim().toLowerCase();
    const mail = (email || '').trim().toLowerCase();
    const exp = (diasValidez === -1 || diasValidez >= 9999) ? -1 : (Date.now() + diasValidez * 24 * 60 * 60 * 1000);
    const signature = await computarFirmaLicencia(dId, mail, exp, salt);

    const payload = {
      deviceId: dId,
      email: mail,
      exp: exp,
      signature: signature
    };

    const jsonStr = JSON.stringify(payload);
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(jsonStr, 'utf8').toString('base64');
    }
    return btoa(unescape(encodeURIComponent(jsonStr)));
  }

  /**
   * Valida un token de activación Base64 de forma 100% offline
   * @param {string} tokenBase64 
   * @param {string} [currentDeviceId] Device ID actual para verificar pertenencia
   * @param {string} [salt]
   * @returns {Promise<{ valido: boolean, error?: string, payload?: object }>}
   */
  async function validarTokenLicencia(tokenBase64, currentDeviceId = null, salt = LICENSE_SALT) {
    if (!tokenBase64 || typeof tokenBase64 !== 'string') {
      return { valido: false, error: 'Token de activación no proporcionado o formato inválido.' };
    }

    let cleanToken = tokenBase64.trim();
    if ((cleanToken.startsWith('"') && cleanToken.endsWith('"')) || 
        (cleanToken.startsWith("'") && cleanToken.endsWith("'"))) {
      cleanToken = cleanToken.slice(1, -1).trim();
    }
    cleanToken = cleanToken.replace(/\s+/g, '');

    let jsonStr = '';
    try {
      if (typeof Buffer !== 'undefined') {
        jsonStr = Buffer.from(cleanToken, 'base64').toString('utf8');
      } else {
        jsonStr = decodeURIComponent(escape(atob(cleanToken)));
      }
    } catch (err) {
      return { valido: false, error: 'El formato del token no es una cadena Base64 válida.' };
    }

    let payload;
    try {
      payload = JSON.parse(jsonStr);
    } catch (err) {
      return { valido: false, error: 'El contenido del token no es un JSON estructurado.' };
    }

    if (!payload || typeof payload !== 'object') {
      return { valido: false, error: 'Payload de licencia nulo o incorrecto.' };
    }

    const { deviceId, email, exp, signature } = payload;

    if (!deviceId || !email || exp === undefined || !signature) {
      return { valido: false, error: 'El token carece de los campos obligatorios (deviceId, email, exp, signature).' };
    }

    const dId = (deviceId || '').trim().toLowerCase();
    const mail = (email || '').trim().toLowerCase();
    const curDevId = (currentDeviceId || '').trim().toLowerCase();

    // 1. Validar vinculación con el dispositivo receptor (insensible a mayúsculas/minúsculas)
    if (curDevId && dId !== curDevId) {
      return {
        valido: false,
        error: `Token emitido para otro dispositivo (${deviceId}). Tu Device ID actual es: ${currentDeviceId}.`
      };
    }

    // 2. Validar expiración temporal
    const expNum = typeof exp === 'string' ? parseInt(exp, 10) : exp;
    const isPerpetual = expNum === -1 || expNum >= (Date.now() + 2500 * 24 * 60 * 60 * 1000);
    if (!isPerpetual && expNum < Date.now()) {
      const expDate = new Date(expNum).toLocaleDateString('es-CL');
      return { valido: false, error: `Esta licencia expiró el ${expDate}.` };
    }

    // 3. Validar autenticidad de la firma SHA-256 offline
    const expVal = (exp !== undefined && exp !== null) ? exp.toString().trim() : '-1';
    const rawDevId = (deviceId || '').trim();
    const rawEmail = (email || '').trim();

    const candidateSignatures = [
      await computarHashSHA256(`${dId}|${mail}|${expVal}|${salt}`),
      await computarHashSHA256(`${rawDevId}|${rawEmail}|${expVal}|${salt}`),
      await computarHashSHA256(`${dId}:${mail}:${expVal}:${salt}`),
      await computarHashSHA256(`${rawDevId}:${rawEmail}:${expVal}:${salt}`)
    ];

    const sigClean = signature.trim().toLowerCase();
    const isSignatureValid = candidateSignatures.some(cand => cand.toLowerCase() === sigClean);

    if (!isSignatureValid) {
      return { valido: false, error: 'Firma criptográfica inválida. El token ha sido alterado o es apócrifo.' };
    }

    return {
      valido: true,
      payload: {
        deviceId: dId,
        email: mail,
        exp: expNum,
        isPerpetual: isPerpetual,
        expirationDate: isPerpetual ? 'Perpetua' : new Date(expNum).toISOString()
      }
    };
  }

  /**
   * Evalúa el estado actual de licenciamiento y prueba del dispositivo
   * @param {Object} params
   * @param {string} params.deviceId Identificador del dispositivo
   * @param {number} [params.trialStartDate] Timestamp en ms del inicio del trial
   * @param {string} [params.licenseToken] Token de licencia persistido
   * @param {Object} [params.licensePayload] Payload decodificado si ya fue validado
   * @param {number} [params.now] Timestamp actual
   * @returns {Object} Estado de licencia estructurado
   */
  function obtenerEstadoLicencia(params = {}) {
    const now = params.now || Date.now();
    const { deviceId, trialStartDate, licenseToken, licensePayload } = params;

    // Si hay una licencia activa con payload válido
    if (licensePayload && (licensePayload.isPerpetual || licensePayload.exp === -1 || licensePayload.exp > now)) {
      const isPerpetual = licensePayload.isPerpetual || licensePayload.exp === -1;
      let diasRestantes = -1;
      if (!isPerpetual && licensePayload.exp > now) {
        diasRestantes = Math.ceil((licensePayload.exp - now) / (24 * 60 * 60 * 1000));
      }
      return {
        activo: true,
        esTrial: false,
        licenciado: true,
        expirado: false,
        isPerpetual,
        diasRestantes,
        label: isPerpetual ? 'Licencia Vitalicia Activa' : `Licencia Activa (${diasRestantes}d)`,
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
      };
    }

    // Modo Trial (Período de prueba de 7 días)
    const start = trialStartDate || now;
    const elapsed = now - start;
    const remainingMs = TRIAL_DURATION_MS - elapsed;
    const diasRestantes = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
    const trialExpirado = remainingMs <= 0;

    if (!trialExpirado) {
      return {
        activo: true,
        esTrial: true,
        licenciado: false,
        expirado: false,
        diasRestantes,
        label: `Trial: ${diasRestantes}d restantes`,
        badgeClass: diasRestantes <= 2 
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
      };
    }

    // Trial expirado sin licencia
    return {
      activo: false,
      esTrial: true,
      licenciado: false,
      expirado: true,
      diasRestantes: 0,
      label: 'Período de Prueba Expirado',
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
    };
  }

  /**
   * Genera el HTML responsivo para el indicador de licencia en el header.
   * Totalmente visible en iPhone y dispositivos móviles en modo vertical (sin hidden sm:flex),
   * adaptando el texto con clases responsivas compactas para evitar desbordes.
   * @param {Object} status - Objeto de estado { licenciado, expirado, diasRestantes }
   * @returns {string} Fragmento HTML
   */
  function generarHtmlBadgeLicencia(status) {
    if (!status) return '';

    if (status.licenciado) {
      return `
        <div class="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0" data-nav-view="settings" title="Licencia Personal Activa">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0"></i>
          <span class="hidden sm:inline">Licencia Activa</span>
          <span class="sm:hidden">Activa</span>
        </div>
      `.trim();
    }

    if (status.expirado) {
      return `
        <div class="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-sm animate-pulse cursor-pointer flex-shrink-0" data-nav-view="settings" title="Período de prueba vencido">
          <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0"></i>
          <span class="hidden sm:inline">Trial Vencido</span>
          <span class="sm:hidden">Expirado</span>
        </div>
      `.trim();
    }

    const dias = status.diasRestantes !== undefined ? status.diasRestantes : 7;
    return `
      <div class="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-sm cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0" data-nav-view="settings" title="Período de prueba gratuito">
        <i data-lucide="clock" class="w-3.5 h-3.5 text-indigo-500 flex-shrink-0"></i>
        <span class="hidden sm:inline">Trial: ${dias}d restantes</span>
        <span class="sm:hidden">Trial: ${dias}d</span>
      </div>
    `.trim();
  }

  return {
    TRIAL_DAYS,
    TRIAL_DURATION_MS,
    LICENSE_SALT,
    CONTACT_PHONE,
    generarDeviceId,
    generarCadenaSolicitud,
    generarEnlaceWhatsApp,
    computarHashSHA256,
    computarFirmaLicencia,
    generarTokenLicencia,
    validarTokenLicencia,
    obtenerEstadoLicencia,
    generarHtmlBadgeLicencia
  };
}));
