/** Derives notices from persisted municipal decisions and consolidation events, without server delivery claims. */
export function administrativeNotices(report, viewerId) {
  if (!report || !viewerId) return [];
  const authorized = report.reporterId === viewerId || (report.confirmations || []).some(c => c.reporterId === viewerId);
  if (!authorized) return [];
  const notices = [];
  if (report.municipalDecision?.action === 'dismiss') {
    const decision = report.municipalDecision;
    notices.push({ id: `dismiss:${report.ticket}:${decision.at}`, at: decision.at, ticket: report.ticket,
      title: 'Reporte desestimado', message: `Causal: ${decision.cause}. ${decision.justification}`,
      url: `/reportes/${encodeURIComponent(report.ticket)}` });
  }
  const masterTicket = report.masterTicket || report.consolidation?.masterTicket;
  if (masterTicket && report.consolidation?.role === 'secondary') {
    notices.push({ id: `merge:${report.ticket}:${masterTicket}`, at: report.consolidation.consolidatedAt || report.updatedAt, ticket: report.ticket,
      title: 'Reporte unido a expediente maestro', message: `Tu ticket ${report.ticket} ahora se atiende mediante ${masterTicket}.`,
      url: `/reportes/${encodeURIComponent(masterTicket)}` });
  }
  return notices.sort((a,b) => String(b.at).localeCompare(String(a.at)));
}
