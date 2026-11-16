// HU-06: independent spatial calculations and duplicate warnings.
const inactiveStatuses = ['resuelto', 'cerrado', 'desestimado', 'anulado', 'cancelado'];
export function isActiveReport(report) {
  return !inactiveStatuses.some((status) => (report?.status || '').toLowerCase().includes(status));
}
export function distanceMeters(a, b) {
  const rad = (degrees) => degrees * Math.PI / 180;
  const latDiff = rad(b.lat - a.lat);
  const lngDiff = rad(b.lng - a.lng);
  const x = Math.sin(latDiff / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(lngDiff / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
export function nearbyMatches(reports, position, category, excludeTicket = null) {
  if (!category) return [];
  return reports.filter((report) => report.ticket !== excludeTicket && report.category === category
    && isActiveReport(report) && report.position && Number.isFinite(report.position.lat)
    && Number.isFinite(report.position.lng))
    .map((report) => ({
      ticket: report.ticket, status: report.status, createdAt: report.createdAt,
      distanceMeters: distanceMeters(report.position, position),
    }))
    .filter((report) => report.distanceMeters <= 50)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
