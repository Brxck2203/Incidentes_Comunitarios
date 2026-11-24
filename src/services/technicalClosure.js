export function validateTechnicalClosure(report, input, at = new Date().toISOString()) {
  if (!report || !['Asignado', 'En atención'].includes(report.status)) throw new Error('Solo se puede concluir una orden asignada o en atención.');
  if (report.masterTicket || report.consolidation?.role === 'secondary') throw new Error('Concluye la orden desde el expediente maestro.');
  const note = typeof input?.note === 'string' ? input.note.trim() : '';
  const worker = typeof input?.worker === 'string' ? input.worker.trim() : '';
  if (!note || note.length > 2000) throw new Error('Escribe una nota técnica breve (máximo 2000 caracteres).');
  if (!worker || worker.length > 120) throw new Error('Indica el encargado de la cuadrilla.');
  if (!Array.isArray(input?.photos) || input.photos.length < 1) throw new Error('Adjunta al menos una fotografía del trabajo terminado.');
  const closure = { at, note, photos: input.photos, worker };
  return { ...report, status: 'Atendido', technicalClosure: closure, updatedAt: at, receptionEvent: 'Cierre técnico completado',
    history: [...(report.history || []), { at, action: 'Orden concluida con evidencia fotográfica de respaldo', responsible: worker, previousStatus: report.status, newStatus: 'Atendido' }] };
}
