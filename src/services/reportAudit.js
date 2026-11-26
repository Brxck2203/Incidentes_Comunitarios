/** A client-side append-only event model. True tamper-proof auditing requires server permissions. */
export function addAudit(previous, next, { action, actor = 'Usuario de la plataforma', role = 'sistema', at = new Date().toISOString() }) {
  if (!previous || !next || previous.ticket !== next.ticket) throw new Error('No se puede auditar un reporte inexistente.');
  const prior = Array.isArray(previous.auditLog) ? previous.auditLog : [];
  const entry = { id: `${next.ticket}:${prior.length + 1}`, at, action,
    actor, role, previousStatus: previous.status || '', newStatus: next.status || '' };
  return { ...next, auditLog: [...prior, entry] };
}
export function initialAudit(report) {
  return { ...report, auditLog: [{ id: `${report.ticket}:1`, at: report.createdAt, action: 'Reporte registrado', actor: report.reporterId || 'Ciudadano anónimo', role: 'ciudadano', previousStatus: '', newStatus: report.status }] };
}
