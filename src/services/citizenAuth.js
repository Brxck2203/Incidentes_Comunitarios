import { resolveReportsListTracking } from './consolidatedTracking.js';
import { endorsementCount } from './reportEndorsements.js';

// Base IndexedDB separada para no tocar 'reporte-ciudadano' (v2) ni el padrón interno de HU-33.
export const CITIZEN_DB_NAME = 'reporte-ciudadano-cuentas-ciudadanas';
export const CITIZEN_DB_VERSION = 1;
export const CITIZEN_STORE_NAME = 'citizens';

export const SESSION_STORAGE_KEY = 'reporte-ciudadano-sesion';
export const PARTICIPANT_STORAGE_KEY = 'reporte-ciudadano-participante';
export const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;
export const PBKDF2_ITERATIONS = 100000;
export const GENERIC_LOGIN_ERROR = 'Correo electrónico o contraseña incorrectos.';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SESSION_EVENT_NAME = 'citizen-session-changed';
const fallbackMemoryStorage = new Map();

function readStorageItem(key) {
  try {
    if (globalThis.localStorage) {
      return globalThis.localStorage.getItem(key);
    }
  } catch {
    // Respaldo en memoria para entornos de prueba restringidos.
  }
  return fallbackMemoryStorage.has(key) ? fallbackMemoryStorage.get(key) : null;
}

function writeStorageItem(key, value) {
  const str = String(value);
  fallbackMemoryStorage.set(key, str);
  try {
    if (globalThis.localStorage) {
      globalThis.localStorage.setItem(key, str);
    }
  } catch {
    // Si localStorage está bloqueado, conserva el respaldo en memoria de la pestaña.
  }
}

function removeStorageItem(key) {
  fallbackMemoryStorage.delete(key);
  try {
    if (globalThis.localStorage) {
      globalThis.localStorage.removeItem(key);
    }
  } catch {
    // Ignorar error de almacenamiento bloqueado al limpiar.
  }
}

function notifySessionChange(detail) {
  if (typeof globalThis.window?.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    globalThis.window.dispatchEvent(new CustomEvent(SESSION_EVENT_NAME, { detail }));
  }
}

export function subscribeToSessionChanges(listener) {
  if (typeof globalThis.window?.addEventListener !== 'function') {
    return () => {};
  }
  const handler = (event) => listener(event.detail);
  globalThis.window.addEventListener(SESSION_EVENT_NAME, handler);
  return () => globalThis.window.removeEventListener(SESSION_EVENT_NAME, handler);
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error('La credencial almacenada no tiene un formato válido.');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Deriva un hash PBKDF2-SHA-256 con sal aleatoria usando Web Crypto API.
 * Nunca guarda ni retorna la contraseña en texto plano.
 */
export async function derivePasswordCredential(
  password,
  { saltHex = null, iterations = PBKDF2_ITERATIONS } = {},
) {
  if (typeof password !== 'string' || !password) {
    throw new Error('Ingresa una contraseña válida.');
  }
  const saltBytes = saltHex
    ? hexToBytes(saltHex)
    : globalThis.crypto.getRandomValues(new Uint8Array(16));

  const encoder = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBytes,
      iterations,
    },
    keyMaterial,
    256,
  );

  return {
    algorithm: 'PBKDF2-SHA-256',
    iterations,
    saltHex: bytesToHex(saltBytes),
    hashHex: bytesToHex(new Uint8Array(derivedBits)),
  };
}

export async function verifyPasswordCredential(password, credential) {
  if (
    typeof password !== 'string' ||
    !password ||
    !credential ||
    credential.algorithm !== 'PBKDF2-SHA-256' ||
    !credential.saltHex ||
    !credential.hashHex
  ) {
    return false;
  }
  const candidate = await derivePasswordCredential(password, {
    saltHex: credential.saltHex,
    iterations: Number(credential.iterations) || PBKDF2_ITERATIONS,
  });
  return timingSafeEqualHex(candidate.hashHex, credential.hashHex);
}

export function validateCitizenRegistrationInput({ email, password }) {
  const rawEmail = typeof email === 'string' ? email.trim() : '';
  if (!rawEmail) {
    throw new Error('Ingresa un correo electrónico.');
  }
  if (rawEmail.length > 160 || !EMAIL_PATTERN.test(rawEmail)) {
    throw new Error('Ingresa un correo electrónico con formato válido.');
  }

  if (typeof password !== 'string' || !password.trim()) {
    throw new Error('Ingresa una contraseña válida.');
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `La contraseña debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres.`,
    );
  }

  return {
    email: rawEmail.toLocaleLowerCase(),
    password,
  };
}

export function sanitizeCitizenAccount(account) {
  if (!account || typeof account !== 'object') return null;
  return {
    id: account.id,
    email: account.email,
    role: account.role || 'ciudadano',
    roleLabel: account.roleLabel || 'Ciudadano',
    active: account.active !== false,
    primaryReporterId: account.primaryReporterId,
    linkedReporterIds: Array.isArray(account.linkedReporterIds)
      ? [...account.linkedReporterIds]
      : account.primaryReporterId
        ? [account.primaryReporterId]
        : [],
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

/**
 * Determina si un reporterId anónimo del navegador aún no pertenece a ninguna cuenta ciudadana.
 */
export function isReporterIdUnclaimed(reporterId, existingAccounts = []) {
  if (typeof reporterId !== 'string' || !reporterId.trim()) return false;
  const target = reporterId.trim();
  return !existingAccounts.some(
    (account) =>
      account &&
      (account.primaryReporterId === target ||
        (Array.isArray(account.linkedReporterIds) &&
          account.linkedReporterIds.includes(target))),
  );
}

function openCitizenDatabase() {
  return new Promise((resolve, reject) => {
    const idb = globalThis.indexedDB || globalThis.window?.indexedDB;
    if (!idb) {
      reject(new Error('El navegador no permite abrir el almacenamiento de cuentas.'));
      return;
    }
    const request = idb.open(CITIZEN_DB_NAME, CITIZEN_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(CITIZEN_STORE_NAME)
        ? request.transaction.objectStore(CITIZEN_STORE_NAME)
        : db.createObjectStore(CITIZEN_STORE_NAME, { keyPath: 'id' });
      if (!store.indexNames.contains('email')) {
        store.createIndex('email', 'email', { unique: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error('No se pudo abrir el almacenamiento de cuentas ciudadanas.'));
    request.onblocked = () =>
      reject(new Error('Cierra otras pestañas de la aplicación e inténtalo de nuevo.'));
  });
}

async function citizenTransaction(mode, action) {
  const database = await openCitizenDatabase();
  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = database.transaction(CITIZEN_STORE_NAME, mode);
    } catch {
      database.close();
      reject(new Error('No se pudo iniciar la operación de cuenta ciudadana.'));
      return;
    }

    let result;
    let failure = null;
    let settled = false;

    tx.oncomplete = () => {
      database.close();
      settled = true;
      resolve(result);
    };
    tx.onabort = () => {
      database.close();
      if (settled) return;
      settled = true;
      reject(failure || new Error('No se pudo completar la operación de la cuenta.'));
    };
    tx.onerror = () => {};

    const abort = (error) => {
      failure =
        error instanceof Error
          ? error
          : new Error(typeof error === 'string' ? error : 'Operación rechazada.');
      try {
        tx.abort();
      } catch {
        database.close();
        if (!settled) {
          settled = true;
          reject(failure);
        }
      }
    };

    try {
      action(tx.objectStore(CITIZEN_STORE_NAME), (value) => {
        result = value;
      }, abort);
    } catch (err) {
      abort(err);
    }
  });
}

function persistActiveSession(
  account,
  { now = new Date().toISOString(), timeoutMinutes = DEFAULT_SESSION_TIMEOUT_MINUTES } = {},
) {
  const safeTimeout =
    Number.isFinite(timeoutMinutes) && timeoutMinutes > 0
      ? timeoutMinutes
      : DEFAULT_SESSION_TIMEOUT_MINUTES;
  const nowMs = Date.parse(now);
  const expiresAt = new Date(nowMs + safeTimeout * 60 * 1000).toISOString();

  const session = {
    userId: account.id,
    email: account.email,
    role: account.role || 'ciudadano',
    roleLabel: account.roleLabel || 'Ciudadano',
    active: account.active !== false,
    primaryReporterId: account.primaryReporterId,
    linkedReporterIds: Array.isArray(account.linkedReporterIds)
      ? [...account.linkedReporterIds]
      : [account.primaryReporterId],
    issuedAt: now,
    lastActivityAt: now,
    expiresAt,
    timeoutMinutes: safeTimeout,
  };

  writeStorageItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  if (session.primaryReporterId) {
    writeStorageItem(PARTICIPANT_STORAGE_KEY, session.primaryReporterId);
  }
  notifySessionChange({ type: 'login', session });
  return session;
}

/**
 * Consulta la sesión activa actual verificando expiración suave por inactividad.
 */
export function getCurrentSession({
  now = new Date().toISOString(),
  renew = false,
} = {}) {
  const raw = readStorageItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return { session: null, expired: false };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeStorageItem(SESSION_STORAGE_KEY);
    return { session: null, expired: false };
  }

  if (!parsed || typeof parsed.userId !== 'string' || parsed.active === false) {
    removeStorageItem(SESSION_STORAGE_KEY);
    return { session: null, expired: false };
  }

  const nowMs = Date.parse(now);
  const expiresMs = Date.parse(parsed.expiresAt || '');
  if (Number.isFinite(nowMs) && Number.isFinite(expiresMs) && nowMs > expiresMs) {
    removeStorageItem(SESSION_STORAGE_KEY);
    writeStorageItem(PARTICIPANT_STORAGE_KEY, crypto.randomUUID());
    notifySessionChange({ type: 'expired', session: null });
    return { session: null, expired: true };
  }

  if (renew && Number.isFinite(nowMs)) {
    const timeout =
      Number.isFinite(parsed.timeoutMinutes) && parsed.timeoutMinutes > 0
        ? parsed.timeoutMinutes
        : DEFAULT_SESSION_TIMEOUT_MINUTES;
    const renewed = {
      ...parsed,
      lastActivityAt: now,
      expiresAt: new Date(nowMs + timeout * 60 * 1000).toISOString(),
    };
    writeStorageItem(SESSION_STORAGE_KEY, JSON.stringify(renewed));
    return { session: renewed, expired: false };
  }

  return { session: parsed, expired: false };
}

/**
 * Cierra la sesión activa y asigna un identificador de participante nuevo al navegador
 * para impedir que otro usuario posterior absorba los reportes de la cuenta saliente.
 */
export function logoutCurrentSession() {
  removeStorageItem(SESSION_STORAGE_KEY);
  writeStorageItem(PARTICIPANT_STORAGE_KEY, crypto.randomUUID());
  notifySessionChange({ type: 'logout', session: null });
}

/**
 * Comprueba si el identificador anónimo actual del navegador está libre para ofrecer
 * asociarlo durante el registro.
 */
export async function canClaimCurrentBrowserActivity() {
  const currentParticipant = readStorageItem(PARTICIPANT_STORAGE_KEY);
  if (!currentParticipant) return false;
  const allAccounts = await citizenTransaction('readonly', (store, done, abort) => {
    const req = store.getAll();
    req.onsuccess = () => done(req.result);
    req.onerror = () => abort(new Error('No se pudieron consultar las cuentas existentes.'));
  });
  return isReporterIdUnclaimed(currentParticipant, allAccounts);
}

/**
 * Registra una cuenta ciudadana nueva con hash PBKDF2-SHA-256 e inicia su sesión de inmediato.
 */
export async function registerCitizenAccount(
  input = {},
  {
    now = new Date().toISOString(),
    timeoutMinutes = DEFAULT_SESSION_TIMEOUT_MINUTES,
    iterations = PBKDF2_ITERATIONS,
  } = {},
) {
  const validated = validateCitizenRegistrationInput(input);
  const credential = await derivePasswordCredential(validated.password, { iterations });
  const claimBrowserReports = input.claimBrowserReports !== false;
  const currentParticipant = readStorageItem(PARTICIPANT_STORAGE_KEY);

  const createdAccount = await citizenTransaction('readwrite', (store, done, abort) => {
    const listReq = store.getAll();
    listReq.onsuccess = () => {
      try {
        const existing = listReq.result || [];
        const duplicate = existing.some(
          (item) =>
            typeof item?.email === 'string' &&
            item.email.trim().toLocaleLowerCase() === validated.email,
        );
        if (duplicate) {
          throw new Error('Ya existe una cuenta registrada con ese correo electrónico.');
        }

        const canClaimCurrent =
          claimBrowserReports && isReporterIdUnclaimed(currentParticipant, existing);
        const primaryReporterId = canClaimCurrent
          ? currentParticipant.trim()
          : crypto.randomUUID();

        const account = {
          id: `CIT-${crypto.randomUUID()}`,
          email: validated.email,
          role: 'ciudadano',
          roleLabel: 'Ciudadano',
          active: true,
          primaryReporterId,
          linkedReporterIds: [primaryReporterId],
          credential,
          createdAt: now,
          updatedAt: now,
        };

        const addReq = store.add(account);
        addReq.onsuccess = () => done(account);
        addReq.onerror = () =>
          abort(new Error('Ya existe una cuenta registrada con ese correo electrónico.'));
      } catch (err) {
        abort(err);
      }
    };
    listReq.onerror = () =>
      abort(new Error('No se pudo verificar la unicidad del correo electrónico.'));
  });

  const session = persistActiveSession(createdAccount, { now, timeoutMinutes });
  return {
    user: sanitizeCitizenAccount(createdAccount),
    session,
  };
}

/**
 * Autentica a un ciudadano existente usando mensajes de error genéricos ante fallos de credencial.
 * TODO: integrar recuperación de contraseña cuando se implemente HU-32.
 */
export async function loginCitizenAccount(
  input = {},
  {
    now = new Date().toISOString(),
    timeoutMinutes = DEFAULT_SESSION_TIMEOUT_MINUTES,
    iterations = PBKDF2_ITERATIONS,
  } = {},
) {
  const rawEmail = typeof input?.email === 'string' ? input.email.trim().toLocaleLowerCase() : '';
  const rawPassword = typeof input?.password === 'string' ? input.password : '';

  if (!rawEmail || !EMAIL_PATTERN.test(rawEmail) || !rawPassword) {
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  const allAccounts = await citizenTransaction('readonly', (store, done, abort) => {
    const req = store.getAll();
    req.onsuccess = () => done(req.result || []);
    req.onerror = () => abort(new Error('No se pudo consultar la cuenta ciudadana.'));
  });

  const matched = allAccounts.find(
    (item) =>
      typeof item?.email === 'string' &&
      item.email.trim().toLocaleLowerCase() === rawEmail,
  );

  if (!matched) {
    // Ejecuta derivación ficticia para no filtrar por tiempo si el correo existe.
    await derivePasswordCredential(rawPassword, {
      saltHex: '00112233445566778899aabbccddeeff',
      iterations,
    });
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  const passwordValid = await verifyPasswordCredential(rawPassword, matched.credential);
  if (!passwordValid) {
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  if (matched.active === false) {
    throw new Error('Esta cuenta se encuentra desactivada.');
  }

  const session = persistActiveSession(matched, { now, timeoutMinutes });
  return {
    user: sanitizeCitizenAccount(matched),
    session,
  };
}

/**
 * Construye el portafolio de reportes publicados y casos respaldados por la cuenta ciudadana,
 * omitiendo identificadores privados de terceros (RNF-05).
 */
export function buildCitizenPortfolio(reports = [], accountOrSession = null) {
  if (!Array.isArray(reports) || !accountOrSession) {
    return { publishedReports: [], supportedReports: [] };
  }

  const ownedIds = new Set(
    Array.isArray(accountOrSession.linkedReporterIds) &&
      accountOrSession.linkedReporterIds.length > 0
      ? accountOrSession.linkedReporterIds
      : accountOrSession.primaryReporterId
        ? [accountOrSession.primaryReporterId]
        : [],
  );

  if (ownedIds.size === 0) {
    return { publishedReports: [], supportedReports: [] };
  }

  const trackingByTicket = resolveReportsListTracking(reports);
  const publishedReports = [];
  const supportedReports = [];

  for (const report of reports) {
    if (!report || typeof report.ticket !== 'string') continue;
    const tracking = trackingByTicket[report.ticket];
    const effectiveStatus = tracking?.masterUnavailable
      ? 'Estado del maestro no disponible'
      : tracking?.effectiveStatus ?? report.status ?? 'Estado no disponible';
    const masterTicket = report.masterTicket || report.consolidation?.masterTicket || null;

    if (report.reporterId && ownedIds.has(report.reporterId)) {
      publishedReports.push({
        ticket: report.ticket,
        category: report.category || 'Sin clasificar',
        status: report.status,
        effectiveStatus,
        createdAt: report.createdAt,
        updatedAt: tracking?.effectiveUpdatedAt ?? report.updatedAt,
        supportersCount: endorsementCount(report),
        isConsolidatedSecondary: Boolean(tracking?.isConsolidatedSecondary),
        masterTicket,
      });
      continue;
    }

    const confirmations = Array.isArray(report.confirmations) ? report.confirmations : [];
    const myConfirmation = confirmations.find(
      (item) => item?.reporterId && ownedIds.has(item.reporterId),
    );
    if (myConfirmation) {
      supportedReports.push({
        ticket: report.ticket,
        category: report.category || 'Sin clasificar',
        effectiveStatus,
        createdAt: report.createdAt,
        supportedAt: myConfirmation.at || report.updatedAt,
        supportersCount: endorsementCount(report),
        isConsolidatedSecondary: Boolean(tracking?.isConsolidatedSecondary),
        masterTicket,
      });
    }
  }

  publishedReports.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
  supportedReports.sort((a, b) => String(b.supportedAt ?? '').localeCompare(String(a.supportedAt ?? '')));

  return {
    publishedReports,
    supportedReports,
  };
}
