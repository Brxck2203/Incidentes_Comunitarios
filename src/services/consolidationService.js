// TODO: integrar con consola municipal cuando se integre HU-11
// TODO: reutilizar contrato de masterTicket y secondaryTickets cuando se integre HU-09

export const DEFAULT_OFFICIAL_NAME = 'Gestor municipal';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error('El navegador no permite guardar reportes.'));
    }
    const request = indexedDB.open('reporte-ciudadano', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('reports')) {
        request.result.createObjectStore('reports', { keyPath: 'ticket' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento.'));
    request.onblocked = () => reject(new Error('Cierra otras pestañas de la aplicación e inténtalo de nuevo.'));
  });
}

/**
 * Valida los parámetros de entrada para la consolidación de reportes (RF-05 / HU-08).
 */
export function validateConsolidationInput({ tickets, masterTicket, reason, official }) {
  const uniqueTickets = Array.from(
    new Set((Array.isArray(tickets) ? tickets : []).map((item) => String(item ?? '').trim()).filter(Boolean)),
  );

  if (uniqueTickets.length < 2) {
    throw new Error('Selecciona al menos dos reportes para consolidar en un caso maestro.');
  }

  const trimmedMaster = String(masterTicket ?? '').trim();
  if (!trimmedMaster || !uniqueTickets.includes(trimmedMaster)) {
    throw new Error('Selecciona cuál de los tickets elegidos quedará como reporte principal (caso maestro).');
  }

  const trimmedReason = String(reason ?? '').trim();
  if (!trimmedReason) {
    throw new Error('Ingresa el motivo obligatorio de consolidación.');
  }

  const trimmedOfficial = String(official ?? '').trim() || DEFAULT_OFFICIAL_NAME;

  return {
    tickets: uniqueTickets,
    masterTicket: trimmedMaster,
    secondaryTickets: uniqueTickets.filter((ticket) => ticket !== trimmedMaster),
    reason: trimmedReason,
    official: trimmedOfficial,
  };
}

/**
 * Aplica la consolidación sobre un diccionario de reportes en memoria, validando elegibilidad,
 * preservando tickets individuales, fusionando evidencias con trazabilidad y registrando en bitácora.
 */
export function applyConsolidationToRecords({
  reportsByTicket,
  tickets,
  masterTicket,
  reason,
  official,
  at = new Date().toISOString(),
}) {
  const validated = validateConsolidationInput({ tickets, masterTicket, reason, official });

  const masterCurrent = reportsByTicket[validated.masterTicket];
  if (!masterCurrent) {
    throw new Error(`No se encontró el reporte maestro seleccionado (${validated.masterTicket}).`);
  }

  if (masterCurrent.masterTicket) {
    throw new Error(
      `El reporte ${validated.masterTicket} ya es secundario del expediente maestro ${masterCurrent.masterTicket} y no puede ser caso maestro.`,
    );
  }

  const secondaryCurrentList = [];
  for (const secTicket of validated.secondaryTickets) {
    const secReport = reportsByTicket[secTicket];
    if (!secReport) {
      throw new Error(`No se encontró el reporte seleccionado (${secTicket}).`);
    }
    if (secReport.masterTicket && secReport.masterTicket !== validated.masterTicket) {
      throw new Error(
        `El reporte ${secTicket} ya fue consolidado previamente bajo el expediente maestro ${secReport.masterTicket}.`,
      );
    }
    if (Array.isArray(secReport.secondaryTickets) && secReport.secondaryTickets.length > 0) {
      throw new Error(
        `El reporte ${secTicket} ya actúa como caso maestro de otros reportes y no puede asignarse como secundario.`,
      );
    }
    secondaryCurrentList.push(secReport);
  }

  const existingSecondaryTickets = Array.isArray(masterCurrent.secondaryTickets)
    ? masterCurrent.secondaryTickets
    : [];
  const existingMergedEvidence = Array.isArray(masterCurrent.mergedEvidence)
    ? masterCurrent.mergedEvidence
    : [];

  const updatedSecondaryTickets = [...existingSecondaryTickets];
  const updatedMergedEvidence = [...existingMergedEvidence];
  const newlyConsolidatedTickets = [];
  const updatedSecondaries = [];

  for (const secReport of secondaryCurrentList) {
    const alreadyLinked = updatedSecondaryTickets.includes(secReport.ticket);
    if (!alreadyLinked) {
      updatedSecondaryTickets.push(secReport.ticket);
      newlyConsolidatedTickets.push(secReport.ticket);
    }

    const alreadyHasEvidence = updatedMergedEvidence.some(
      (entry) => entry.sourceTicket === secReport.ticket,
    );
    if (!alreadyHasEvidence) {
      updatedMergedEvidence.push({
        sourceTicket: secReport.ticket,
        createdAt: secReport.createdAt,
        capturedAt: secReport.capturedAt ?? secReport.createdAt,
        category: secReport.category ?? '',
        description: secReport.description ?? '',
        transcription: secReport.transcription ?? '',
        references: secReport.references ?? '',
        position: secReport.position ?? null,
        audio: secReport.audio ?? null,
        photos: Array.isArray(secReport.photos) ? [...secReport.photos] : [],
        consolidatedAt: at,
      });
    }

    const secondaryHistoryEntry = {
      at,
      official: validated.official,
      reason: validated.reason,
      masterTicket: validated.masterTicket,
      action: `Consolidado como reporte secundario en el caso maestro ${validated.masterTicket} por ${validated.official}. Motivo: ${validated.reason}`,
    };

    const updatedSecondary = {
      ...secReport,
      masterTicket: validated.masterTicket,
      consolidation: {
        role: 'secondary',
        masterTicket: validated.masterTicket,
        consolidatedAt: at,
        official: validated.official,
        reason: validated.reason,
      },
      updatedAt: at,
      receptionEvent: `Consolidado en ${validated.masterTicket}`,
      history: [...(Array.isArray(secReport.history) ? secReport.history : []), secondaryHistoryEntry],
    };

    updatedSecondaries.push(updatedSecondary);
  }

  if (newlyConsolidatedTickets.length === 0) {
    throw new Error('Los reportes seleccionados ya estaban consolidados bajo este caso maestro.');
  }

  const masterHistoryEntry = {
    at,
    official: validated.official,
    reason: validated.reason,
    secondaryTickets: newlyConsolidatedTickets,
    action: `Consolidación en caso maestro (${newlyConsolidatedTickets.join(', ')}) registrada por ${validated.official}. Motivo: ${validated.reason}`,
  };

  const updatedMaster = {
    ...masterCurrent,
    isMaster: true,
    secondaryTickets: updatedSecondaryTickets,
    mergedEvidence: updatedMergedEvidence,
    consolidation: {
      role: 'master',
      secondaryTickets: updatedSecondaryTickets,
      lastConsolidatedAt: at,
      official: validated.official,
      reason: validated.reason,
    },
    updatedAt: at,
    receptionEvent: `Caso maestro (${updatedSecondaryTickets.length} unificados)`,
    history: [...(Array.isArray(masterCurrent.history) ? masterCurrent.history : []), masterHistoryEntry],
  };

  return {
    masterReport: updatedMaster,
    secondaryReports: updatedSecondaries,
  };
}

/**
 * Ejecuta la consolidación de forma atómica en IndexedDB dentro de una sola transacción readwrite.
 */
export async function consolidateReports({ tickets, masterTicket, reason, official }) {
  const validated = validateConsolidationInput({ tickets, masterTicket, reason, official });
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = database.transaction('reports', 'readwrite');
    const store = tx.objectStore('reports');
    const reportsByTicket = {};
    let resultPayload = null;
    let failureError = null;

    tx.oncomplete = () => {
      database.close();
      resolve(resultPayload);
    };
    tx.onabort = () => {
      database.close();
      reject(
        failureError ||
          new Error('No se pudo completar la consolidación. Revisa los datos e inténtalo de nuevo.'),
      );
    };
    tx.onerror = () => {};

    let remaining = validated.tickets.length;
    for (const ticket of validated.tickets) {
      const request = store.get(ticket);
      request.onsuccess = () => {
        if (request.result) {
          reportsByTicket[ticket] = request.result;
        }
        remaining -= 1;
        if (remaining === 0) {
          try {
            resultPayload = applyConsolidationToRecords({
              reportsByTicket,
              tickets: validated.tickets,
              masterTicket: validated.masterTicket,
              reason: validated.reason,
              official: validated.official,
            });
            store.put(resultPayload.masterReport);
            for (const secReport of resultPayload.secondaryReports) {
              store.put(secReport);
            }
          } catch (error) {
            failureError = error;
            tx.abort();
          }
        }
      };
      request.onerror = () => {
        failureError = new Error(`Error al leer el reporte ${ticket}.`);
        tx.abort();
      };
    }
  });
}
