import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCitizenPortfolio,
  derivePasswordCredential,
  isReporterIdUnclaimed,
  sanitizeCitizenAccount,
  validateCitizenRegistrationInput,
  verifyPasswordCredential,
} from './citizenAuth.js';

test('derivePasswordCredential genera hash PBKDF2-SHA-256 con sal aleatoria sin exponer nunca la contraseña en texto plano', async () => {
  const secret = 'claveSegura2026';
  const cred1 = await derivePasswordCredential(secret, { iterations: 5000 });
  const cred2 = await derivePasswordCredential(secret, { iterations: 5000 });

  assert.equal(cred1.algorithm, 'PBKDF2-SHA-256');
  assert.equal(cred1.saltHex.length, 32);
  assert.equal(cred1.hashHex.length, 64);
  assert.notEqual(cred1.saltHex, cred2.saltHex);
  assert.notEqual(cred1.hashHex, cred2.hashHex);
  assert.equal(JSON.stringify(cred1).includes(secret), false);

  assert.equal(await verifyPasswordCredential(secret, cred1), true);
  assert.equal(await verifyPasswordCredential('otraClave', cred1), false);
});

test('validateCitizenRegistrationInput valida formato de correo y longitud de contraseña entre 6 y 128 caracteres', () => {
  const valid = validateCitizenRegistrationInput({
    email: 'Vecino.Norte@Comunidad.CR ',
    password: 'mipass',
  });
  assert.equal(valid.email, 'vecino.norte@comunidad.cr');

  assert.throws(
    () => validateCitizenRegistrationInput({ email: 'correo-invalido', password: 'mipass' }),
    /formato válido/i,
  );
  assert.throws(
    () => validateCitizenRegistrationInput({ email: 'a@b.cr', password: '12345' }),
    /entre 6 y 128 caracteres/i,
  );
  assert.throws(
    () => validateCitizenRegistrationInput({ email: 'a@b.cr', password: '      ' }),
    /contraseña válida/i,
  );
});

test('isReporterIdUnclaimed y sanitizeCitizenAccount protegen credenciales e impiden reclamar identificadores ajenos', () => {
  const rawAccount = {
    id: 'CIT-1',
    email: 'ana@ejemplo.local',
    role: 'ciudadano',
    roleLabel: 'Ciudadano',
    active: true,
    primaryReporterId: 'rep-ana',
    linkedReporterIds: ['rep-ana'],
    credential: { algorithm: 'PBKDF2-SHA-256', saltHex: 'aa', hashHex: 'bb' },
  };

  const sanitized = sanitizeCitizenAccount(rawAccount);
  assert.equal('credential' in sanitized, false);
  assert.equal(isReporterIdUnclaimed('rep-ana', [rawAccount]), false);
  assert.equal(isReporterIdUnclaimed('rep-libre', [rawAccount]), true);
});

test('buildCitizenPortfolio separa reportes publicados y casos respaldados sin filtrar reporterId de terceros', () => {
  const reports = [
    {
      ticket: 'RC-OWN-1',
      reporterId: 'rep-vecino-1',
      category: 'Baches',
      status: 'Admitido a trámite',
      createdAt: '2026-11-20T09:00:00.000Z',
      updatedAt: '2026-11-21T09:00:00.000Z',
      confirmations: [{ reporterId: 'rep-otro', at: '2026-11-20T12:00:00.000Z' }],
    },
    {
      ticket: 'RC-SUPPORTED-1',
      reporterId: 'rep-autor-tercero',
      category: 'Basura clandestina',
      status: 'Asignado',
      createdAt: '2026-11-18T08:00:00.000Z',
      updatedAt: '2026-11-19T10:00:00.000Z',
      confirmations: [
        { reporterId: 'rep-vecino-1', at: '2026-11-19T10:00:00.000Z' },
        { reporterId: 'rep-tercero-2', at: '2026-11-19T11:00:00.000Z' },
      ],
    },
    {
      ticket: 'RC-UNRELATED',
      reporterId: 'rep-ajeno',
      category: 'Aceras dañadas',
      status: 'Registrado / Recibido',
      createdAt: '2026-11-22T08:00:00.000Z',
      updatedAt: '2026-11-22T08:00:00.000Z',
      confirmations: [],
    },
  ];

  const portfolio = buildCitizenPortfolio(reports, {
    linkedReporterIds: ['rep-vecino-1'],
  });

  assert.equal(portfolio.publishedReports.length, 1);
  assert.equal(portfolio.publishedReports[0].ticket, 'RC-OWN-1');
  assert.equal(portfolio.publishedReports[0].supportersCount, 1);

  assert.equal(portfolio.supportedReports.length, 1);
  assert.equal(portfolio.supportedReports[0].ticket, 'RC-SUPPORTED-1');
  assert.equal(portfolio.supportedReports[0].supportersCount, 2);
  assert.equal('reporterId' in portfolio.supportedReports[0], false);
  assert.equal(JSON.stringify(portfolio.supportedReports).includes('rep-autor-tercero'), false);
});
