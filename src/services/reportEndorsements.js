// HU-10: status and endorsement helpers for existing reports.
const inactiveStatuses = ['resuelto', 'cerrado', 'desestimado', 'anulado', 'cancelado'];
export function isActiveReport(report) {
  return !inactiveStatuses.some((status) => (report?.status || '').toLowerCase().includes(status));
}
export function endorsementCount(report) {
  return report?.confirmations?.length ?? 0;
}
