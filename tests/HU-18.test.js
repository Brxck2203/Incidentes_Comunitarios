import test from 'node:test'; import assert from 'node:assert/strict';
import { validateTechnicalClosure } from '../src/services/technicalClosure.js';
const report={ticket:'RC-1',status:'Asignado',history:[]};
test('HU-18: requiere foto y nota de cierre',()=>{assert.throws(()=>validateTechnicalClosure(report,{worker:'Ana',note:'Reparado',photos:[]}));assert.throws(()=>validateTechnicalClosure(report,{worker:'Ana',note:' ',photos:[{}]}));});
test('HU-18: cambia a Atendido',()=>{const r=validateTechnicalClosure(report,{worker:'Ana',note:'Reparación finalizada',photos:[{name:'foto.png'}]});assert.equal(r.status,'Atendido');assert.equal(r.technicalClosure.photos.length,1);});
