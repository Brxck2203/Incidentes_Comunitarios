import test from 'node:test'; import assert from 'node:assert/strict';
import { municipalCrews, validateCrewAssignment } from '../src/services/crewAssignment.js';
const report = { ticket:'RC-1', category:'Baches', status:'Admitido a trámite', history:[] };
const input = { department:'Red Vial', crew:'Cuadrilla de bacheo', instructions:'Reparar calzada', deadline:'2027-01-10', responsible:'Gestor A' };
test('HU-15: asigna categoría, cuadrilla y cambia estado', () => {const result=validateCrewAssignment(report,input,'2026-11-24T12:00:00Z');assert.equal(result.status,'Asignado');assert.equal(result.assignment.crew,input.crew);assert.equal(municipalCrews.Baches.department,'Red Vial');});
test('HU-15: impide cuadrilla ajena y tickets sin admisión', () => {assert.throws(()=>validateCrewAssignment(report,{...input,crew:'Poda'},'2026-11-24T12:00:00Z'));assert.throws(()=>validateCrewAssignment({...report,status:'Registrado'},input,'2026-11-24T12:00:00Z'));});
