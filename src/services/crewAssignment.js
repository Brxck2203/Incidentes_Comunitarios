export const municipalCrews = {
  'Baches': { department: 'Red Vial', crews: ['Cuadrilla de bacheo', 'Cuadrilla de vías'] },
  'Basura clandestina': { department: 'Gestión Ambiental', crews: ['Cuadrilla de limpieza', 'Cuadrilla de residuos'] },
  'Ramas/arbolado': { department: 'Parques y Ornato', crews: ['Cuadrilla de poda', 'Cuadrilla de arboricultura'] },
  'Aceras dañadas': { department: 'Mantenimiento de Infraestructura', crews: ['Cuadrilla de aceras', 'Cuadrilla de obras menores'] },
};
export function validateCrewAssignment(report, input, at = new Date().toISOString()) {
  if (!report || report.status !== 'Admitido a trámite') throw new Error('Solo se puede asignar un reporte admitido a trámite.');
  if (report.masterTicket || report.consolidation?.role === 'secondary') throw new Error('Asigna desde el expediente maestro.');
  const option = municipalCrews[report.category];
  if (!option) throw new Error('Este reporte necesita una categoría válida antes de asignarlo.');
  if (input?.department !== option.department || !option.crews.includes(input?.crew)) throw new Error('Selecciona una cuadrilla de la categoría correspondiente.');
  const instructions = typeof input.instructions === 'string' ? input.instructions.trim() : '';
  if (!instructions || instructions.length > 2000) throw new Error('Escribe instrucciones técnicas (máximo 2000 caracteres).');
  const responsible = typeof input.responsible === 'string' ? input.responsible.trim() : '';
  if (!responsible || responsible.length > 120) throw new Error('Indica el funcionario responsable.');
  if (typeof input.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) throw new Error('Selecciona una fecha límite válida.');
  const selected = new Date(`${input.deadline}T23:59:59.999Z`);
  if (Number.isNaN(selected.getTime()) || selected.toISOString().slice(0, 10) !== input.deadline || selected.getTime() < new Date(at).getTime()) throw new Error('La fecha límite no puede estar vencida.');
  const assignment = { department: option.department, crew: input.crew, instructions, deadline: input.deadline, responsible, at };
  return { ...report, status: 'Asignado', assignment, updatedAt: at, receptionEvent: 'Cuadrilla asignada', history: [...(report.history || []), { at, action: `Asignado a ${assignment.crew} (${assignment.department}), hasta ${assignment.deadline}.`, responsible }] };
}
