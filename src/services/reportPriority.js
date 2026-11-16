// Pure calculations: priority is ordered first by technical severity and then by citizen endorsements.
export const severityLevels = ['Leve', 'Moderado', 'Grave', 'Crítico'];
const severityWeight = { Leve: 1, Moderado: 2, Grave: 3, Crítico: 4 };
const inactiveStatuses = ['resuelto', 'cerrado', 'desestimado', 'anulado', 'cancelado'];

export function isActiveReport(report) {
  return !inactiveStatuses.some((status) => (report?.status || '').toLowerCase().includes(status));
}

export function endorsementCount(report) {
  return report?.confirmations?.length ?? 0;
}

export function priorityInfo(report) {
  const level = severityWeight[report.severity] || 0;
  const supporters = endorsementCount(report);
  return { level, supporters, score: level * 100 + supporters * 10 };
}

export function sortReceptionReports(reports) {
  return [...reports].sort((a, b) => {
    const aa = priorityInfo(a);
    const bb = priorityInfo(b);
    // A grave or critical incident must remain above lower severities, regardless of volume.
    return Number(isActiveReport(b)) - Number(isActiveReport(a))
      || bb.level - aa.level
      || bb.supporters - aa.supporters
      || a.createdAt.localeCompare(b.createdAt);
  });
}

