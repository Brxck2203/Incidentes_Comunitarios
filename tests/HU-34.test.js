import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createReport,
  getReport,
  recordMunicipalDecision,
} from '../src/services/reportRepository.js';
import {
  STAFF_DB_NAME,
  STAFF_STORE_NAME,
  getActiveAccessSession,
  loginRoleSession,
  verifySessionAccountActive,
} from '../src/services/accessControl.js';

const samplePhoto = () => new Blob(['foto'], { type: 'image/png' });

function setupAccessAndAuditEnvironment(staffAccounts = []) {
  const localStore = new Map();
  globalThis.localStorage = {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k),
  };

  const dbs = {
    'reporte-ciudadano': {
      version: 0,
      keyField: 'ticket',
      storeName: 'reports',
      records: new Map(),
      indexes: new Set(),
    },
    [STAFF_DB_NAME]: {
      version: 1,
      keyField: 'id',
      storeName: STAFF_STORE_NAME,
      records: new Map(staffAccounts.map((acc) => [acc.id, { ...acc }])),
      indexes: new Set(['email']),
    },
  };

  const indexedDBMock = {
    open(dbName, version) {
      const target = dbs[dbName];
      assert.ok(target, `Base no contemplada en prueba: ${dbName}`);

      const storeMeta = {
        indexNames: { contains: (idx) => target.indexes.has(idx) },
        createIndex: (idx) => target.indexes.add(idx),
      };

      const dbHandle = {
        objectStoreNames: {
          contains: (name) => name === target.storeName && target.version >= 1,
        },
        close: () => {},
        createObjectStore: () => storeMeta,
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
              const schedule = (fn) => {
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
                get: (key) => schedule(() => target.records.get(key)),
                getAll: () => schedule(() => Array.from(target.records.values())),
                add: (val) =>
                  schedule(() => {
                    const k = val[target.keyField];
                    target.records.set(k, val);
                    return k;
                  }),
                put: (val) =>
                  schedule(() => {
                    const k = val[target.keyField];
                    target.records.set(k, val);
                    return k;
                  }),
              };
            },
          };
          return tx;
        },
      };

      const req = {
        result: dbHandle,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        onblocked: null,
      };
      setTimeout(() => {
        if (version > target.version) {
          req.transaction = { objectStore: () => storeMeta };
          req.onupgradeneeded?.();
          target.version = version;
        }
        req.onsuccess?.();
      }, 0);
      return req;
    },
  };

  globalThis.window = { indexedDB: indexedDBMock };
  globalThis.indexedDB = indexedDBMock;

  return { dbs };
}

test('HU-34: al desactivar un funcionario se bloquea de inmediato su sesión e inicio de sesión sin borrar sus registros históricos en auditLog ni history', async () => {
  const gestorAccount = {
    id: 'USR-GESTOR-01',
    fullName: 'Gestor Vial Municipal',
    email: 'gestor.vial@municipalidad.local',
    role: 'gestor',
    department: 'Red Vial',
    active: true,
  };

  const { dbs } = setupAccessAndAuditEnvironment([gestorAccount]);

  // 1. El funcionario activo inicia sesión y registra una decisión municipal que queda en auditLog
  const session = await loginRoleSession(
    { email: 'gestor.vial@municipalidad.local' },
    { now: '2026-11-27T09:00:00.000Z' },
  );
  assert.equal(session.role, 'gestor');
  assert.equal(getActiveAccessSession({ now: '2026-11-27T09:05:00.000Z' }).valid, true);

  const createdReport = await createReport({
    photos: [samplePhoto()],
    position: { lat: 10.324, lng: -84.431 },
    category: 'Baches',
  });
  const adjudicated = await recordMunicipalDecision(createdReport.ticket, {
    action: 'admit',
    responsible: gestorAccount.fullName,
  });

  const auditBeforeDeactivation = structuredClone(adjudicated.auditLog);
  const historyBeforeDeactivation = structuredClone(adjudicated.history);
  assert.equal(auditBeforeDeactivation.length, 2);
  assert.equal(auditBeforeDeactivation[1].actor, 'Gestor Vial Municipal');

  // 2. La cuenta del funcionario se desactiva en el padrón administrativo (HU-33)
  dbs[STAFF_DB_NAME].records.set(gestorAccount.id, {
    ...gestorAccount,
    active: false,
  });

  // 3. Su sesión abierta queda revocada de inmediato al verificar estado activo
  const liveCheck = await verifySessionAccountActive({
    now: '2026-11-27T09:10:00.000Z',
  });
  assert.equal(liveCheck.valid, false);
  assert.equal(liveCheck.reason, 'deactivated');
  assert.equal(getActiveAccessSession({ now: '2026-11-27T09:10:00.000Z' }).session, null);

  // 4. Cualquier nuevo intento de inicio de sesión queda bloqueado de inmediato
  await assert.rejects(
    () => loginRoleSession({ email: 'GESTOR.VIAL@municipalidad.local' }),
    /desactivada.*bloqueado/i,
  );

  // 5. Los registros históricos de sus acciones en la bitácora permanecen 100 % intactos
  const storedAfterDeactivation = await getReport(createdReport.ticket);
  assert.deepEqual(storedAfterDeactivation.auditLog, auditBeforeDeactivation);
  assert.deepEqual(storedAfterDeactivation.history, historyBeforeDeactivation);
  assert.equal(dbs['reporte-ciudadano'].version, 2);
});
