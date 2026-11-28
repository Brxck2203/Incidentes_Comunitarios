import test from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmIncident,
  createReport,
  getCurrentReporterId,
  getReports,
} from '../src/services/reportRepository.js';
import {
  CITIZEN_DB_NAME,
  CITIZEN_STORE_NAME,
  GENERIC_LOGIN_ERROR,
  buildCitizenPortfolio,
  getCurrentSession,
  loginCitizenAccount,
  logoutCurrentSession,
  registerCitizenAccount,
} from '../src/services/citizenAuth.js';

const samplePhoto = () => new Blob(['evidencia'], { type: 'image/jpeg' });

function setupMultiDbEnvironment() {
  const storageMap = new Map();
  globalThis.localStorage = {
    getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
  };

  const dbs = {
    'reporte-ciudadano': {
      version: 0,
      keyField: 'ticket',
      storeName: 'reports',
      records: new Map(),
      indexes: new Set(),
    },
    [CITIZEN_DB_NAME]: {
      version: 0,
      keyField: 'id',
      storeName: CITIZEN_STORE_NAME,
      records: new Map(),
      indexes: new Set(),
    },
  };

  const indexedDBMock = {
    open(dbName, requestedVersion) {
      const target = dbs[dbName];
      assert.ok(target, `Base inesperada: ${dbName}`);

      const storeMeta = {
        indexNames: { contains: (idx) => target.indexes.has(idx) },
        createIndex: (idx) => target.indexes.add(idx),
      };

      const dbHandle = {
        objectStoreNames: {
          contains: (name) => name === target.storeName && target.version >= 1,
        },
        close: () => {},
        createObjectStore: (name) => {
          assert.equal(name, target.storeName);
          return storeMeta;
        },
        transaction(storeName) {
          assert.equal(storeName, target.storeName);
          let pending = 0;
          let timer = null;
          let aborted = false;

          const tx = {
            oncomplete: null,
            onabort: null,
            onerror: null,
            abort() {
              if (aborted) return;
              aborted = true;
              if (timer) clearTimeout(timer);
              setTimeout(() => tx.onabort?.(), 0);
            },
            objectStore() {
              const runAsync = (fn) => {
                const req = { onsuccess: null, onerror: null, transaction: tx };
                pending += 1;
                if (timer) clearTimeout(timer);
                setTimeout(() => {
                  if (aborted) return;
                  try {
                    req.result = fn();
                    req.onsuccess?.();
                  } catch (err) {
                    req.error = err;
                    req.onerror?.();
                  }
                  pending -= 1;
                  if (pending === 0 && !aborted) {
                    timer = setTimeout(() => tx.oncomplete?.(), 0);
                  }
                }, 0);
                return req;
              };

              return {
                get: (key) => runAsync(() => target.records.get(key)),
                getAll: () => runAsync(() => Array.from(target.records.values())),
                add: (val) =>
                  runAsync(() => {
                    const k = val[target.keyField];
                    if (target.records.has(k)) throw new Error('duplicate key');
                    target.records.set(k, val);
                    return k;
                  }),
                put: (val) =>
                  runAsync(() => {
                    const k = val[target.keyField];
                    target.records.set(k, val);
                    return k;
                  }),
                index: (name) => ({
                  getAll: (filterVal) =>
                    runAsync(() =>
                      Array.from(target.records.values()).filter(
                        (item) => item[name] === filterVal,
                      ),
                    ),
                }),
              };
            },
          };
          return tx;
        },
      };

      const openReq = {
        result: dbHandle,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        onblocked: null,
      };
      setTimeout(() => {
        if (requestedVersion > target.version) {
          openReq.transaction = { objectStore: () => storeMeta };
          openReq.onupgradeneeded?.();
          target.version = requestedVersion;
        }
        openReq.onsuccess?.();
      }, 0);
      return openReq;
    },
  };

  globalThis.window = { indexedDB: indexedDBMock };
  globalThis.indexedDB = indexedDBMock;
  return { dbs, storageMap };
}

test('HU-31: registro, inicio de sesión, aislamiento entre cuentas, expiración por inactividad y portafolio de reportes publicados y respaldados', async () => {
  const { dbs } = setupMultiDbEnvironment();

  // Reporte de otro vecino existente en la comunidad
  const thirdPartyReport = await createReport({
    photos: [samplePhoto()],
    position: { lat: 10.324, lng: -84.431 },
    category: 'Basura clandestina',
    reporterId: 'vecino-externo-99',
  });

  // Actividad previa del ciudadano 1 antes de registrarse
  const anonIdBeforeSignup = getCurrentReporterId();
  const ownReport = await createReport({
    photos: [samplePhoto()],
    position: { lat: 10.326, lng: -84.433 },
    category: 'Baches',
    reporterId: anonIdBeforeSignup,
  });
  await confirmIncident(thirdPartyReport.ticket, [], anonIdBeforeSignup);

  // Registro ciudadano 1 reclamando su actividad previa
  const signup1 = await registerCitizenAccount(
    {
      email: 'vecino1@comunidad.local',
      password: 'claveVecino1',
      claimBrowserReports: true,
    },
    {
      now: '2026-11-27T10:00:00.000Z',
      timeoutMinutes: 30,
      iterations: 5000,
    },
  );

  assert.equal(signup1.user.email, 'vecino1@comunidad.local');
  assert.equal(signup1.user.role, 'ciudadano');
  assert.equal('credential' in signup1.user, false);

  // Verifica que en IndexedDB jamás se guardó la contraseña en texto plano
  const rawStoredCitizen1 = dbs[CITIZEN_DB_NAME].records.get(signup1.user.id);
  assert.equal(JSON.stringify(rawStoredCitizen1).includes('claveVecino1'), false);
  assert.equal(rawStoredCitizen1.credential.algorithm, 'PBKDF2-SHA-256');

  // Cierra sesión y se registra un ciudadano 2 en el mismo navegador
  logoutCurrentSession();
  assert.equal(getCurrentSession().session, null);

  const signup2 = await registerCitizenAccount(
    {
      email: 'vecino2@comunidad.local',
      password: 'claveVecino2',
      claimBrowserReports: true,
    },
    {
      now: '2026-11-27T10:05:00.000Z',
      iterations: 5000,
    },
  );
  const allReportsAfterUser2 = await getReports();
  const portfolio2 = buildCitizenPortfolio(allReportsAfterUser2, signup2.session);
  assert.equal(portfolio2.publishedReports.length, 0);
  assert.equal(portfolio2.supportedReports.length, 0);

  logoutCurrentSession();

  // Errores genéricos uniformes en login fallido (correo inexistente vs clave incorrecta)
  await assert.rejects(
    () =>
      loginCitizenAccount(
        { email: 'noexiste@comunidad.local', password: 'claveVecino1' },
        { iterations: 5000 },
      ),
    new RegExp(GENERIC_LOGIN_ERROR),
  );
  await assert.rejects(
    () =>
      loginCitizenAccount(
        { email: 'vecino1@comunidad.local', password: 'claveIncorrecta' },
        { iterations: 5000 },
      ),
    new RegExp(GENERIC_LOGIN_ERROR),
  );

  // Inicio de sesión exitoso del ciudadano 1 y consulta de su historial completo
  const login1 = await loginCitizenAccount(
    { email: 'VECINO1@comunidad.local', password: 'claveVecino1' },
    { now: '2026-11-27T11:00:00.000Z', timeoutMinutes: 30, iterations: 5000 },
  );

  const portfolio1 = buildCitizenPortfolio(await getReports(), login1.session);
  assert.equal(portfolio1.publishedReports.length, 1);
  assert.equal(portfolio1.publishedReports[0].ticket, ownReport.ticket);
  assert.equal(portfolio1.supportedReports.length, 1);
  assert.equal(portfolio1.supportedReports[0].ticket, thirdPartyReport.ticket);

  // Expiración suave tras superar 30 minutos de inactividad
  const activeAt20Min = getCurrentSession({ now: '2026-11-27T11:20:00.000Z' });
  assert.equal(activeAt20Min.expired, false);
  assert.equal(activeAt20Min.session.email, 'vecino1@comunidad.local');

  const expiredAt35Min = getCurrentSession({ now: '2026-11-27T11:35:00.000Z' });
  assert.equal(expiredAt35Min.expired, true);
  assert.equal(expiredAt35Min.session, null);

  // La versión de 'reporte-ciudadano' se mantuvo intacta en 2
  assert.equal(dbs['reporte-ciudadano'].version, 2);
});
