import test from 'node:test'; import assert from 'node:assert/strict';
import { addAudit, initialAudit } from '../src/services/reportAudit.js';
test('HU-21: registro inicial y entradas cronológicas anexadas',()=>{const report=initialAudit({ticket:'RC-1',createdAt:'2026-11-24T00:00:00Z',status:'Registrado'});const updated=addAudit(report,{...report,status:'En evaluación'},{action:'Evaluación',actor:'Ana',role:'gestor',at:'2026-11-24T00:01:00Z'});assert.equal(updated.auditLog.length,2);assert.equal(report.auditLog.length,1);assert.equal(updated.auditLog[1].previousStatus,'Registrado');});
