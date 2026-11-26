import test from 'node:test'; import assert from 'node:assert/strict';
import { administrativeNotices } from '../src/services/administrativeNotices.js';
test('HU-24: aviso de desestimación solo para informante',()=>{const r={ticket:'RC-1',reporterId:'a',municipalDecision:{action:'dismiss',at:'2026-11-24',cause:'Fuera de jurisdicción',justification:'Cantón distinto'}};assert.equal(administrativeNotices(r,'a').length,1);assert.equal(administrativeNotices(r,'b').length,0);});
test('HU-24: aviso de unión con enlace maestro',()=>{const r={ticket:'RC-2',reporterId:'a',masterTicket:'RC-1',consolidation:{role:'secondary',consolidatedAt:'2026-11-24'}};assert.equal(administrativeNotices(r,'a')[0].url,'/reportes/RC-1');});
