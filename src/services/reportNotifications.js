const REPORTS_CHANGED_EVENT = 'community-reports:changed';
const REPORTS_CHANNEL = 'community-reports';
const sourceId = `${Date.now()}-${Math.random()}`;

export function notifyReportCreated() {
  try {
    if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event(REPORTS_CHANGED_EVENT));
  } catch (failure) {
    console.warn('El reporte se guardó, pero no se pudo actualizar esta pestaña.', failure);
  }
  if (typeof BroadcastChannel === 'undefined') return;

  let channel;
  try {
    channel = new BroadcastChannel(REPORTS_CHANNEL);
    channel.postMessage({ type: 'reports-changed', sourceId });
  } catch (failure) {
    console.warn('El reporte se guardó, pero no se pudo notificar a otras pestañas.', failure);
  }
  try {
    channel?.close();
  } catch (failure) {
    console.warn('El reporte se guardó, pero no se pudo cerrar el canal de notificación.', failure);
  }
}

export function subscribeToReportChanges(onChange) {
  const handleLocalChange = () => onChange();
  window.addEventListener(REPORTS_CHANGED_EVENT, handleLocalChange);

  let channel;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(REPORTS_CHANNEL);
      channel.addEventListener('message', ({ data }) => {
        if (data?.type === 'reports-changed' && data.sourceId !== sourceId) onChange();
      });
    } catch (failure) {
      console.warn('No se pudo iniciar la notificación entre pestañas; se usará la actualización periódica.', failure);
      channel?.close();
      channel = null;
    }
  }

  return () => {
    window.removeEventListener(REPORTS_CHANGED_EVENT, handleLocalChange);
    try {
      channel?.close();
    } catch (failure) {
      console.warn('No se pudo cerrar el canal de notificación al salir de la lista.', failure);
    }
  };
}
