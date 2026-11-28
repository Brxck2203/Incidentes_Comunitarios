import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuditHistory } from './auditHistory.js';

test('buildAuditHistory ordena cronológicamente todos los movimientos desde la recepción hasta el cierre e identifica funcionario o cuadrilla', () => {
  const report = {
    ticket: 'RC-900',
    createdAt: '2026-11-10T08:00:00.000Z',
    updatedAt: '2026-11-16T17:00:00.000Z',
    status: 'Atendido',
    category: 'Baches',
    assignment: {
      crewId: 'rv-bacheo',
      crewName: 'Cuadrilla de Bacheo y Asfalto',
      department: 'Red Vial',
      assignedBy: 'Ing. Marco Solís',
    },
    history: [
      // Desordenado a propósito para verificar el ordenamiento cronológico ascendente
      {
        at: '2026-11-12T09:00:00.000Z',
        action: 'Expediente admitido a trámite.',
        responsible: 'Lic. Ana Rojas',
        decision: 'admit',
      },
      {
        at: '2026-11-10T08:00:00.000Z',
        action: 'Reporte registrado',
      },
      {
        at: '2026-11-11T10:30:00.000Z',
        action: 'Expediente puesto en evaluación.',
        responsible: 'Lic. Ana Rojas',
        decision: 'evaluation',
      },
      {
        at: '2026-11-13T14:00:00.000Z',
        action: 'Asignado a Red Vial — Cuadrilla de Bacheo y Asfalto',
        responsible: 'Ing. Marco Solís',
        role: 'Gestor municipal',
        previousStatus: 'Admitido a trámite',
        newStatus: 'Asignado',
        observation: 'Instrucción: reparar bache con mezcla caliente.',
      },
      {
        at: '2026-11-16T17:00:00.000Z',
        action: 'Cierre técnico del incidente registrado',
        crewName: 'Cuadrilla de Bacheo y Asfalto',
        role: 'Cuadrilla municipal',
        previousStatus: 'En atención',
        newStatus: 'Atendido',
        technicalNote: 'Bache sellado y compactado.',
      },
    ],
  };

  const auditTrail = buildAuditHistory(report);

  assert.equal(auditTrail.length, 5);
  assert.equal(Object.isFrozen(auditTrail), true);
  assert.equal(Object.isFrozen(auditTrail[0]), true);

  // 1. Recepción
  assert.equal(auditTrail[0].sequence, 1);
  assert.equal(auditTrail[0].at, '2026-11-10T08:00:00.000Z');
  assert.equal(auditTrail[0].actor, 'Ciudadano reportante');
  assert.equal(auditTrail[0].previousStatus, 'Sin estado previo');
  assert.equal(auditTrail[0].newStatus, 'Registrado / Recibido');

  // 2. Evaluación
  assert.equal(auditTrail[1].sequence, 2);
  assert.equal(auditTrail[1].actor, 'Lic. Ana Rojas');
  assert.equal(auditTrail[1].previousStatus, 'Registrado / Recibido');
  assert.equal(auditTrail[1].newStatus, 'En evaluación');

  // 3. Admisión
  assert.equal(auditTrail[2].sequence, 3);
  assert.equal(auditTrail[2].actor, 'Lic. Ana Rojas');
  assert.equal(auditTrail[2].previousStatus, 'En evaluación');
  assert.equal(auditTrail[2].newStatus, 'Admitido a trámite');

  // 4. Asignación a cuadrilla
  assert.equal(auditTrail[3].sequence, 4);
  assert.equal(auditTrail[3].actor, 'Ing. Marco Solís');
  assert.equal(auditTrail[3].previousStatus, 'Admitido a trámite');
  assert.equal(auditTrail[3].newStatus, 'Asignado');
  assert.match(auditTrail[3].observation, /mezcla caliente/);

  // 5. Cierre por cuadrilla
  assert.equal(auditTrail[4].sequence, 5);
  assert.equal(auditTrail[4].actor, 'Cuadrilla de Bacheo y Asfalto');
  assert.equal(auditTrail[4].role, 'Cuadrilla municipal');
  assert.equal(auditTrail[4].newStatus, 'Atendido');
  assert.match(auditTrail[4].observation, /Bache sellado y compactado/);
});

test('buildAuditHistory extrae funcionario, causal y justificación en desestimaciones y consolidaciones', () => {
  const dismissedReport = {
    ticket: 'RC-910',
    createdAt: '2026-11-10T08:00:00.000Z',
    status: 'Desestimado',
    history: [
      { at: '2026-11-10T08:00:00.000Z', action: 'Reporte registrado' },
      {
        at: '2026-11-11T12:00:00.000Z',
        action: 'Expediente desestimado. Causal: Competencia de otra entidad. Justificación: Corresponde a ruta nacional CONAVI',
        responsible: 'Arq. Sofía Castro',
        decision: 'dismiss',
        cause: 'Competencia de otra entidad',
        justification: 'Corresponde a ruta nacional CONAVI',
      },
    ],
  };

  const trail = buildAuditHistory(dismissedReport);
  assert.equal(trail.length, 2);
  assert.equal(trail[1].actor, 'Arq. Sofía Castro');
  assert.equal(trail[1].previousStatus, 'Registrado / Recibido');
  assert.equal(trail[1].newStatus, 'Desestimado');
  assert.match(trail[1].observation, /Competencia de otra entidad/);
  assert.match(trail[1].observation, /ruta nacional CONAVI/);
});

test('buildAuditHistory soporta la propiedad auditLog dedicada si HU-21 la provee y maneja entradas vacías de forma segura', () => {
  assert.deepEqual(buildAuditHistory(null), []);

  const withAuditLog = {
    ticket: 'RC-920',
    auditLog: [
      {
        at: '2026-11-20T09:00:00.000Z',
        action: 'Registro inicial auditado',
        actor: 'Ciudadano reportante',
        role: 'Ciudadano',
        previousStatus: 'Sin estado previo',
        newStatus: 'Registrado / Recibido',
        observation: 'Alta inicial',
      },
    ],
  };

  const trail = buildAuditHistory(withAuditLog);
  assert.equal(trail.length, 1);
  assert.equal(trail[0].actor, 'Ciudadano reportante');
  assert.equal(trail[0].newStatus, 'Registrado / Recibido');
});
