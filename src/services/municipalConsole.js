export function hasValidCoordinates(position) {
  return Boolean(position
    && Number.isFinite(position.lat)
    && Number.isFinite(position.lng)
    && Math.abs(position.lat) <= 90
    && Math.abs(position.lng) <= 180);
}

export function municipalStatusLabel(report, trackingByTicket = {}) {
  const tracking = trackingByTicket[report.ticket];
  if (tracking?.isConsolidatedSecondary && tracking.masterUnavailable) {
    return 'Estado del maestro no disponible';
  }
  return tracking?.effectiveStatus ?? report.status ?? 'Estado no disponible';
}

export function filterMunicipalReports(reports, {
  category = '',
  status = '',
  query = '',
  trackingByTicket = {},
} = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return reports.filter((report) => {
    if (category && report.category !== category) return false;
    if (status && municipalStatusLabel(report, trackingByTicket) !== status) return false;
    if (!normalizedQuery) return true;
    return `${report.ticket ?? ''} ${report.description ?? ''}`
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}
