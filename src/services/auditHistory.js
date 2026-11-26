// Integrado con report.auditLog (HU-21) y enriquecido con report.history para cubrir
// detalles técnicos, causales, asignaciones (HU-15) y cierres técnicos (HU-18).

const INITIAL_STATUS = 'Registrado / Recibido';

function inferStatusTransition(entry, currentStatus) {
  const explicitPrev = typeof entry.previousStatus === 'string' && entry.previousStatus.trim()
    ? entry.previousStatus.trim()
    : '';
  const explicitNext = typeof entry.newStatus === 'string' && entry.newStatus.trim()
    ? entry.newStatus.trim()
    : (typeof entry.status === 'string' && entry.status.trim() ? entry.status.trim() : '');

  if (explicitPrev || explicitNext) {
    const prev = explicitPrev || currentStatus || 'Sin estado previo';
    const next = explicitNext || prev;
    return {
      previousStatus: prev,
      newStatus: next,
      stateChanged: prev !== next,
    };
  }

  const action = typeof entry.action === 'string' ? entry.action.trim() : '';
  const lower = action.toLocaleLowerCase();

  if (lower.includes('reporte registrado')) {
    return {
      previousStatus: 'Sin estado previo',
      newStatus: INITIAL_STATUS,
      stateChanged: true,
    };
  }
  if (lower.includes('puesto en evaluación') || lower.includes('puesto en evaluacion')) {
    const next = 'En evaluación';
    return {
      previousStatus: currentStatus || INITIAL_STATUS,
      newStatus: next,
      stateChanged: (currentStatus || INITIAL_STATUS) !== next,
    };
  }
  if (lower.includes('admitido a trámite') || lower.includes('admitido a tramite') || lower.includes('expediente admitido')) {
    const next = 'Admitido a trámite';
    return {
      previousStatus: currentStatus || INITIAL_STATUS,
      newStatus: next,
      stateChanged: (currentStatus || INITIAL_STATUS) !== next,
    };
  }
  if (lower.includes('reasignado de') || lower.includes('reasignación') || lower.includes('reasignacion')) {
    return {
      previousStatus: 'Asignado',
      newStatus: 'Asignado',
      stateChanged: false,
    };
  }
  if (lower.includes('asignado a') || lower.includes('cuadrilla asignada')) {
    const next = 'Asignado';
    return {
      previousStatus: currentStatus || 'Admitido a trámite',
      newStatus: next,
      stateChanged: (currentStatus || '') !== next,
    };
  }
  if (lower.includes('en atención') || lower.includes('en atencion') || lower.includes('inicio de trabajo')) {
    const next = 'En atención';
    return {
      previousStatus: currentStatus || 'Asignado',
      newStatus: next,
      stateChanged: (currentStatus || '') !== next,
    };
  }
  if (lower.includes('marcado como atendido') || lower.includes('cierre técnico') || lower.includes('cierre tecnico') || lower.includes('orden concluida')) {
    const next = 'Atendido';
    return {
      previousStatus: currentStatus || 'En atención',
      newStatus: next,
      stateChanged: (currentStatus || '') !== next,
    };
  }
  if (lower.includes('marcado como resuelto')) {
    const next = 'Resuelto';
    return {
      previousStatus: currentStatus || INITIAL_STATUS,
      newStatus: next,
      stateChanged: (currentStatus || '') !== next,
    };
  }
  if (lower.includes('expediente desestimado') || lower.includes('fue desestimado')) {
    const next = 'Desestimado';
    return {
      previousStatus: currentStatus || INITIAL_STATUS,
      newStatus: next,
      stateChanged: (currentStatus || '') !== next,
    };
  }
  if (lower.includes('confirmación de solución') || lower.includes('archivado')) {
    const next = 'Archivado';
    return {
      previousStatus: currentStatus || 'Atendido',
      newStatus: next,
      stateChanged: (currentStatus || '') !== next,
    };
  }

  const unchanged = currentStatus || INITIAL_STATUS;
  return {
    previousStatus: unchanged,
    newStatus: unchanged,
    stateChanged: false,
  };
}

function inferActorAndRole(entry, report) {
  const rawRole = (typeof entry.role === 'string' && entry.role.trim()) || '';
  const isCitizenRole = rawRole.toLocaleLowerCase() === 'ciudadano';

  const rawActor =
    (typeof entry.responsible === 'string' && entry.responsible.trim()) ||
    (typeof entry.official === 'string' && entry.official.trim()) ||
    (typeof entry.actor === 'string' && entry.actor.trim()) ||
    (typeof entry.crewName === 'string' && entry.crewName.trim()) ||
    (typeof entry.newCrew === 'string' && entry.newCrew.trim()) ||
    '';

  const action = typeof entry.action === 'string' ? entry.action.trim() : '';
  const lower = action.toLocaleLowerCase();

  // Si HU-21 guardó el UUID local del ciudadano como actor en role === 'ciudadano', mostrar etiqueta legible sin exponer UUID
  if (isCitizenRole) {
    const isNeighbor = lower.includes('confirmación ciudadana') || lower.includes('confirmado por un vecino') || lower.includes('respaldo');
    const cleanActor = !rawActor || rawActor === report?.reporterId || /^[0-9a-f-]{16,}$/i.test(rawActor) || rawActor === 'Ciudadano anónimo'
      ? (isNeighbor ? 'Vecino participante' : 'Ciudadano reportante')
      : rawActor;
    return {
      actor: cleanActor,
      role: 'Ciudadano',
    };
  }

  const explicitActor = rawActor;
  const explicitRole = rawRole;

  if (explicitActor) {
    let role = explicitRole;
    if (!role) {
      if (lower.includes('cuadrilla') && !entry.responsible && !entry.official) {
        role = 'Cuadrilla municipal';
      } else {
        role = 'Funcionario municipal';
      }
    }
    return { actor: explicitActor, role };
  }

  // Intentar extraer "por <Nombre>." si viene en el texto de action (como en consolidación o reasignación)
  const byMatch = action.match(/\bpor\s+([^.]+?)(?:\.\s*Motivo:|$)/i);
  if (byMatch?.[1]?.trim()) {
    return {
      actor: byMatch[1].trim(),
      role: explicitRole || 'Funcionario municipal',
    };
  }

  if (lower.includes('reporte registrado') || lower.includes('información complementada')) {
    return {
      actor: 'Ciudadano reportante',
      role: explicitRole || 'Ciudadano',
    };
  }

  if (lower.includes('confirmado por un vecino') || lower.includes('respaldo')) {
    return {
      actor: 'Vecino participante',
      role: explicitRole || 'Ciudadano',
    };
  }

  if (
    lower.includes('en atención') ||
    lower.includes('cierre técnico') ||
    lower.includes('marcado como atendido') ||
    lower.includes('orden concluida')
  ) {
    const crewFromReport =
      report?.assignment?.crewName ||
      report?.closureCertificate?.department ||
      'Cuadrilla encargada';
    return {
      actor: crewFromReport,
      role: explicitRole || 'Cuadrilla municipal',
    };
  }

  if (
    lower.includes('severidad') ||
    lower.includes('evaluación') ||
    lower.includes('admitido') ||
    lower.includes('desestimado') ||
    lower.includes('consolid') ||
    lower.includes('asignado') ||
    lower.includes('resuelto')
  ) {
    const fallbackOfficial =
      report?.municipalDecision?.responsible ||
      report?.consolidation?.official ||
      report?.assignment?.assignedBy ||
      'Gestor municipal';
    return {
      actor: fallbackOfficial,
      role: explicitRole || 'Funcionario municipal',
    };
  }

  return {
    actor: 'Sistema municipal',
    role: explicitRole || 'Sistema',
  };
}

function inferEventAndObservation(entry) {
  const action = typeof entry.action === 'string' ? entry.action.trim() : 'Movimiento registrado';
  const explicitObservation =
    (typeof entry.observation === 'string' && entry.observation.trim()) ||
    (typeof entry.technicalNote === 'string' && entry.technicalNote.trim()) ||
    '';

  const cause = typeof entry.cause === 'string' && entry.cause.trim() ? entry.cause.trim() : '';
  const justification =
    (typeof entry.justification === 'string' && entry.justification.trim()) ||
    (typeof entry.reason === 'string' && entry.reason.trim()) ||
    '';

  const crewTransition =
    entry.previousCrew && entry.newCrew
      ? `Traslado de «${entry.previousDepartment ? `${entry.previousDepartment} — ` : ''}${entry.previousCrew}» a «${entry.newDepartment ? `${entry.newDepartment} — ` : ''}${entry.newCrew}».`
      : '';

  const parts = [];
  if (crewTransition) parts.push(crewTransition);
  if (cause) parts.push(`Causal: ${cause}.`);
  if (justification) parts.push(`Motivo / Justificación: ${justification}`);
  if (explicitObservation) parts.push(explicitObservation);

  if (parts.length > 0) {
    // Limpiar el título del evento para no repetir dos veces la misma justificación
    const cleanEvent = action.split(/\.\s*(?:Causal|Motivo):/i)[0].trim();
    return {
      event: cleanEvent.endsWith('.') ? cleanEvent.slice(0, -1) : cleanEvent,
      observation: parts.join(' '),
    };
  }

  const inlineReasonMatch = action.match(/^(.*?)\.\s*(Motivo:\s*.+|Causal:\s*.+)$/i);
  if (inlineReasonMatch) {
    return {
      event: inlineReasonMatch[1].trim(),
      observation: inlineReasonMatch[2].trim(),
    };
  }

  return {
    event: action,
    observation: 'Sin observación técnica adicional.',
  };
}

/**
 * Concilia las entradas de `report.history` y `report.auditLog` (HU-21) para no duplicar eventos
 * ocurridos en el mismo instante ni perder movimientos que solo se hayan escrito en una de las dos listas.
 */
function mergeAuditAndHistoryEntries(report) {
  const historyList = Array.isArray(report.history) ? report.history.filter(Boolean) : [];
  const auditList = Array.isArray(report.auditLog) ? report.auditLog.filter(Boolean) : [];

  if (!auditList.length) return historyList;
  if (!historyList.length) return auditList;

  const usedAuditIndices = new Set();
  const merged = [];

  for (const hEntry of historyList) {
    const matchIndex = auditList.findIndex(
      (aEntry, idx) => !usedAuditIndices.has(idx) && aEntry.at && hEntry.at && aEntry.at === hEntry.at,
    );
    if (matchIndex >= 0) {
      usedAuditIndices.add(matchIndex);
      const aEntry = auditList[matchIndex];
      merged.push({
        ...aEntry,
        ...hEntry,
        // Conservar action más descriptiva de history pero respaldar actor, role y estados de auditLog
        action: hEntry.action || aEntry.action,
        actor: hEntry.responsible || hEntry.official || aEntry.actor,
        role: hEntry.role || aEntry.role,
        previousStatus: hEntry.previousStatus || aEntry.previousStatus,
        newStatus: hEntry.newStatus || aEntry.newStatus,
      });
    } else {
      merged.push(hEntry);
    }
  }

  for (let idx = 0; idx < auditList.length; idx += 1) {
    if (!usedAuditIndices.has(idx)) {
      merged.push(auditList[idx]);
    }
  }

  return merged;
}

/**
 * Construye el listado cronológico completo e inmutable de movimientos de auditoría de un expediente (HU-22 / RF-13).
 */
export function buildAuditHistory(report) {
  if (!report || typeof report !== 'object') {
    return Object.freeze([]);
  }

  const rawEntries = mergeAuditAndHistoryEntries(report);

  const indexed = rawEntries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, originalIndex) => {
      // Si el cierre técnico tiene nota en report.technicalClosure y la entrada es la orden concluida, adjuntarla como observación
      if (
        report.technicalClosure?.note &&
        typeof entry.action === 'string' &&
        entry.action.toLocaleLowerCase().includes('orden concluida') &&
        !entry.technicalNote &&
        !entry.observation
      ) {
        return {
          entry: {
            ...entry,
            role: entry.role || 'Cuadrilla municipal',
            technicalNote: report.technicalClosure.note,
          },
          originalIndex,
        };
      }
      return { entry, originalIndex };
    });

  // Ordenar en orden cronológico ascendente (desde recepción hasta cierre), preservando el orden de inserción ante empates
  indexed.sort((a, b) => {
    const timeCompare = String(a.entry.at ?? '').localeCompare(String(b.entry.at ?? ''));
    if (timeCompare !== 0) return timeCompare;
    return a.originalIndex - b.originalIndex;
  });

  let runningStatus = '';
  const auditTrail = [];

  for (let i = 0; i < indexed.length; i += 1) {
    const { entry } = indexed[i];
    const transition = inferStatusTransition(entry, runningStatus);
    runningStatus = transition.newStatus;

    const { actor, role } = inferActorAndRole(entry, report);
    const { event, observation } = inferEventAndObservation(entry);

    const record = Object.freeze({
      id: `${report.ticket || 'RC'}-audit-${i + 1}`,
      sequence: i + 1,
      at: entry.at || report.createdAt || null,
      event,
      actor,
      role,
      previousStatus: transition.previousStatus,
      newStatus: transition.newStatus,
      stateChanged: transition.stateChanged,
      observation,
    });

    auditTrail.push(record);
  }

  return Object.freeze(auditTrail);
}
