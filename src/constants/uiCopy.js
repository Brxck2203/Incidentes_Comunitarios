/**
 * Centralización de textos de la interfaz y glosario hacia el ciudadano.
 *
 * El tratamiento por defecto es 'usted' (neutro/formal para servicio municipal),
 * y puede cambiarse en un solo punto a 'tuteo' o 'voseo' cuando el equipo y el
 * Product Owner definan el punto pendiente #7 de docs/ux/UX_PENDIENTES.md.
 */

export const DEFAULT_TONE = 'usted';

// Bandera para habilitar o retirar fácilmente la sección "Reportes que sigo" (punto pendiente #14 en v3).
export const ENABLE_FOLLOWED_REPORTS_SECTION = true;

// [PROPUESTA - Fase 7]: Interruptor de configuración para el flujo combinado de voz y fotos.
// Desactivado por defecto (false) hasta contar con aprobación del Product Owner.
export const COMBINED_EVIDENCE_ENABLED = true;

// Valores por defecto sugeridos como constantes configurables ([DECISIÓN PENDIENTE] en sección 12 de v3).
export const DEFAULT_MAX_PHOTOS_PER_REPORT = 5;
export const DEFAULT_MAX_VOICE_SECONDS = 60;

let combinedEvidenceOverride = null;

export function setCombinedEvidenceEnabledForTest(value) {
  combinedEvidenceOverride = typeof value === 'boolean' ? value : null;
}

export function isCombinedEvidenceEnabled() {
  if (typeof combinedEvidenceOverride === 'boolean') return combinedEvidenceOverride;
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage?.getItem('ux-combined-evidence');
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {
      // Ignorar restricciones de localStorage
    }
  }
  return COMBINED_EVIDENCE_ENABLED;
}

export function formatEvidenceSummary(reportOrDraft, { confirmationStyle = false } = {}) {
  const hasAudio = Boolean(reportOrDraft?.audio?.size);
  const photoCount = Array.isArray(reportOrDraft?.photos) ? reportOrDraft.photos.length : 0;
  const parts = [];
  if (hasAudio) {
    parts.push('1 nota de voz');
  }
  if (photoCount > 0) {
    parts.push(`${photoCount} ${photoCount === 1 ? 'foto' : 'fotos'}`);
  }
  if (!parts.length) return '';
  if (confirmationStyle) {
    return `Recibimos ${parts.join(' y ')}.`;
  }
  const shortParts = [];
  if (hasAudio) shortParts.push('1 audio');
  if (photoCount > 0) shortParts.push(`${photoCount} ${photoCount === 1 ? 'foto' : 'fotos'}`);
  return `Evidencia: ${shortParts.join(' · ')}`;
}

const COPY_BY_TONE = {
  usted: {
    common: {
      appName: 'Reporte Ciudadano',
      skipToContent: 'Saltar al contenido',
      mainNavAria: 'Navegación principal',
      navReport: 'Reportar',
      navMyReports: 'Mis reportes',
      navMunicipalReception: 'Recepción municipal',
      publishAction: 'Publicar reporte',
      cancelAction: 'Cancelar',
      unclassifiedCategory: 'Sin clasificar',
      unavailable: 'No disponible',
      dateUnavailable: 'Fecha no disponible',
      coordinatesUnavailable: 'Coordenadas no disponibles',
      statusUnavailable: 'Estado no disponible',
      masterStatusUnavailable: 'Estado del maestro no disponible',
      trackingNumberFirstMention: 'Número de seguimiento (ticket)',
      trackingNumberLabel: 'Número de seguimiento',
    },
    notFound: {
      title: 'Página no encontrada',
      description: 'Revise la dirección o vuelva al inicio.',
      backHome: 'Volver al inicio',
    },
    errorBoundary: {
      title: 'No pudimos mostrar esta pantalla',
      description: 'Recargue la aplicación para volver a intentarlo.',
      reloadAction: 'Recargar aplicación',
    },
    home: {
      eyebrow: 'Su comunidad, en sus manos',
      title: 'Reporte un problema en su comunidad',
      lead: 'Grabe una nota de voz o tome una foto. La ubicación se agrega automáticamente. Puede completar los detalles después.',
      permissionContext: 'Necesitamos su ubicación para indicar dónde está el problema, y acceso al micrófono o la cámara según el medio que elija.',
      micIdleTitle: 'Grabar nota de voz',
      micIdleSubtitle: 'Toque para iniciar la grabación (máximo 60 s)',
      micStartingTitle: 'Activando micrófono…',
      micRecordingTitle: (seconds) => `Grabando · ${seconds} segundos restantes`,
      micRecordingSubtitle: 'Toque «Publicar reporte» cuando termine de hablar',
      micAriaIdle: 'Grabar nota de voz',
      micAriaRecording: 'Publicar reporte con la nota de voz actual',
      cameraTitle: 'Tomar foto',
      cameraSubtitle: 'Abre la cámara y publica con ubicación automática',
      cameraAria: 'Tomar foto con la cámara y publicar reporte',
      retakePhotoAction: 'Repetir foto',
      categoryLabel: 'Categoría (opcional)',
      categoryPlaceholder: 'Puede seleccionarla después',
      categoryHelp: 'Puede seleccionarla después. Elegirla ahora ayuda a detectar si ya existe un reporte parecido cerca.',
      recordingStatusHeader: (seconds) => `Grabando · ${seconds} segundos restantes`,
      recordingStatusHint: 'Su voz se está grabando. Presione «Publicar reporte» para enviarlo de inmediato.',
      recordingTimeoutNotice: 'La grabación alcanzó el límite de 60 segundos y se está publicando su reporte.',
      stopAndListenAction: 'Detener y escuchar primero',
      stopRecordingAction: 'Detener',
      discardRecordingAction: 'Descartar y volver a grabar',
      discardedRecordingNotice: 'Grabación descartada. Puede grabar una nueva nota de voz cuando guste.',
      combinedLeadExtra: 'También puede usar ambas.',
      addPhotoSecondaryAction: '+ Agregar foto',
      addVoiceSecondaryAction: '+ Agregar nota de voz',
      removeAudioAction: 'Quitar nota de voz',
      removePhotoAction: (index) => `Quitar foto ${index + 1}`,
      photosCounterLabel: (current, max) => `${current} de ${max} fotos`,
      maxPhotosReachedNotice: (max) => `Llegó al máximo de fotos (${max} fotos por reporte).`,
      partialPhotoError: (fileName, reason) => `No se pudo adjuntar la fotografía «${fileName}» (${reason}). Sus demás evidencias se conservan; puede reintentar solo esa fotografía.`,
      publishingStatus: 'Enviando su reporte y obteniendo ubicación…',
      publishButtonIdle: 'Publicar reporte',
      publishButtonBusy: 'Enviando su reporte…',
      autoLocationFootnote: 'La ubicación de su dispositivo y la fecha se asocian automáticamente al publicar. Podrá ajustar el marcador en el mapa después.',
      replacePhotoConfirm: 'Hay una evidencia lista sin publicar. ¿Desea reemplazarla por esta foto?',
      replaceAudioConfirm: 'Hay una evidencia lista sin publicar. ¿Desea reemplazarla por una nueva nota de voz?',
      emptyVoiceError: 'La grabación no generó audio. Vuelva a grabar su nota de voz e intente publicar de nuevo.',
      missingEvidenceError: 'Grabe una nota de voz o tome una foto antes de tocar «Publicar reporte».',
      stopBeforePhotoError: 'Detenga o descarte la grabación actual antes de tomar una foto.',
      retryHint: 'Su evidencia sigue guardada en esta pantalla; puede intentar «Publicar reporte» nuevamente.',
      goToMyReports: 'Consultar mis reportes',
    },
    permissions: {
      geolocationUnsupported: 'Su navegador no admite geolocalización. Abra la aplicación en un navegador compatible con GPS.',
      geolocationDenied: 'No se pudo obtener su ubicación porque el permiso fue denegado. Active el permiso de ubicación en su navegador y vuelva a tocar «Publicar reporte».',
      geolocationUnavailable: 'No se pudo obtener su ubicación. Active el GPS de su dispositivo o acérquese a un espacio abierto e intente de nuevo.',
      micUnsupported: 'La grabación de voz requiere un navegador compatible en conexión segura (HTTPS o localhost). También puede reportar tomando una foto.',
      micFormatUnsupported: 'Este navegador no dispone de un formato de audio compatible. Puede reportar el incidente tomando una foto.',
      micDenied: 'Permita el acceso al micrófono en su navegador para grabar la nota de voz, o utilice la opción «Tomar foto».',
      micFailed: 'No se pudo completar la grabación de voz. Verifique su micrófono y vuelva a intentarlo.',
    },
    duplicates: {
      citizenHeading: 'Ya existe un reporte parecido cerca de este lugar',
      citizenDescription: 'Encontramos un reporte abierto de la misma categoría a menos de 50 metros. Puede revisar el reporte existente o continuar con el envío del suyo.',
      viewExistingAction: (ticket) => `Ver reporte existente (${ticket})`,
      continuePublishAction: 'Continuar con el envío',
      continueSaveEditAction: 'Guardar cambios de todos modos',
      editNearbyHint: 'Ya existe un reporte parecido cerca de esta ubicación en la misma categoría.',
      municipalBadge: 'Posible duplicado',
      municipalBadgeAria: 'Indicador de posible duplicado',
      municipalMatchesSummary: (ticket, distanceText, extraCount) => ({
        prefix: 'Coincide con',
        ticket,
        distance: distanceText ? ` (${distanceText})` : '',
        extra: extraCount > 0 ? ` y ${extraCount} más` : '',
      }),
      comparisonTitle: 'Comparación con reporte preexistente en la misma zona y categoría',
      comparisonChecking: 'Verificando posibles reportes duplicados…',
      comparisonNone: 'No se encontraron posibles reportes duplicados.',
      comparisonErrorPrefix: 'No se pudo verificar posibles duplicados:',
    },
    confirmation: {
      title: 'Reporte recibido',
      subtitle: 'La municipalidad ya tiene su aviso. Guarde su Número de seguimiento (ticket) para consultar el avance.',
      copyAction: 'Copiar número',
      copiedNotice: 'Número de seguimiento copiado al portapapeles.',
      copyFallbackNotice: 'Seleccione y copie el número de seguimiento mostrado en pantalla.',
      viewReportAction: 'Ver mi reporte',
      addDetailsAction: 'Agregar más detalles',
      optionalNote: 'Agregar más detalles es opcional y no genera otro reporte; se conserva este mismo número de seguimiento.',
      lowAccuracyWarning: (meters) => `La ubicación automática tuvo un margen aproximado de ${meters} metros. Si lo desea, puede usar «Agregar más detalles» para ajustar el marcador en el mapa.`,
    },
    detail: {
      backToReception: 'Volver a Recepción municipal',
      backToMyReports: 'Volver a Mis reportes',
      unavailableTitle: 'Reporte no disponible',
      notFoundError: 'No se encontró el número de seguimiento solicitado.',
      title: 'Detalle del reporte',
      createdAtLabel: 'Fecha de registro',
      updatedAtLabel: 'Última actualización',
      evidenceHeading: 'Evidencias aportadas',
      neighborPhotosHeading: 'Fotografías complementarias de vecinos',
      pendingPhotosHeading: 'Fotografías nuevas por guardar',
      noEvidenceYet: 'Sin archivos multimedia adicionales.',
      incidentInfoHeading: 'Información del incidente',
      categoryLabel: 'Categoría',
      descriptionLabel: 'Descripción',
      noDescription: 'Sin descripción adicional.',
      transcriptionLabel: 'Nota o transcripción de voz',
      referencesLabel: 'Señas o referencias',
      locationHeading: 'Ubicación',
      locationUnavailable: 'Ubicación no disponible.',
      coordinatesLine: (lat, lng) => `Latitud: ${lat} · Longitud: ${lng}`,
      deviceAccuracyLine: (meters) => `Precisión original del dispositivo: ${meters} metros.`,
      addDetailsButton: 'Agregar más detalles',
      editFormTitle: 'Agregar más detalles (opcional)',
      editFormNote: 'Sus cambios actualizan este mismo reporte y conservan el número de seguimiento',
      blockDescriptionLegend: '1. Descripción y referencias',
      blockCategoryLegend: '2. Categoría (opcional)',
      blockPhotosLegend: '3. Fotografías adicionales',
      blockLocationLegend: '4. Ubicación en el mapa',
      categoryFieldLabel: 'Categoría (opcional)',
      categoryFieldHelp: 'Puede dejarla sin clasificar si no está seguro.',
      descriptionFieldLabel: 'Descripción del problema',
      transcriptionFieldLabel: 'Transcripción o complemento de la nota de voz',
      referencesFieldLabel: 'Señas o referencias del lugar',
      addPhotosFieldLabel: 'Agregar fotografías (JPG, PNG, WebP o AVIF)',
      adjustLocationHelp: 'Arrastre el marcador en el mapa si necesita precisar el punto exacto del incidente.',
      saveChangesAction: 'Guardar cambios',
      savingChangesAction: 'Guardando…',
      savedChangesNotice: (ticket) => `Cambios guardados. Su número de seguimiento (${ticket}) se mantiene sin cambios.`,
      historyHeading: 'Historial de actualizaciones',
      publicDecisionHeading: 'Respuesta municipal',
      publicDecisionDate: (dateStr) => `Registrada el ${dateStr}.`,
      technicalSeverityLabel: 'Severidad técnica',
      confirmationsCountLabel: (count) => `Vecinos que respaldan este reporte: ${count}`,
      endorseToggleOpen: 'A mí también me afecta (Confirmar incidente)',
      endorseToggleClose: 'Cerrar respaldo',
      endorseSavedNotice: 'Su respaldo quedó registrado. Recibirá avisos en «Mis reportes» cuando el problema se resuelva.',
    },
    endorsement: {
      formTitle: 'A mí también me afecta',
      formExplanation: 'Suma un respaldo a este reporte y le avisaremos cuando se resuelva. No genera un número de seguimiento nuevo.',
      optionalPhotoLabel: 'Fotografía adicional de evidencia (opcional)',
      submitIdle: 'A mí también me afecta (Confirmar incidente)',
      submitBusy: 'Registrando respaldo…',
      alreadyConfirmedNotice: 'Usted ya respaldó este reporte y recibirá un aviso aquí cuando se resuelva.',
      ownReportNotice: 'Este reporte fue creado desde este navegador; no es necesario respaldarlo.',
      closedReportNotice: 'Este reporte ya fue cerrado y no admite nuevos respaldos.',
      savedBanner: 'Respaldo guardado. Le avisaremos en esta pantalla cuando el incidente se resuelva.',
    },
    jointAttention: {
      badge: 'Atención conjunta',
      citizenTitle: 'Atención conjunta del problema',
      municipalTitle: 'Seguimiento del expediente maestro',
      citizenLead: 'Su reporte se está atendiendo junto con otros del mismo problema. Puede seguir consultando con este número.',
      citizenTraceability: (ticket, masterTicket) => ({
        prefix: `Su número de seguimiento ${ticket} está vinculado al expediente principal`,
        masterTicket,
        suffix: 'para coordinar una sola cuadrilla de atención.',
      }),
      secondaryBannerPrefix: 'Este reporte se atiende de forma conjunta dentro del expediente principal',
      masterStatusLabel: 'Estado global de la atención',
      masterCodeLabel: 'Expediente principal',
      masterUpdatedLabel: 'Última actualización',
      timelineHeading: 'Avance del expediente principal',
      timelineEmpty: 'El expediente principal se encuentra registrado y en espera de nuevas actualizaciones.',
    },
    reportsPage: {
      citizenTitle: 'Mis reportes y seguimiento comunitario',
      municipalTitle: 'Recepción municipal',
      searchLabel: 'Consultar por número de seguimiento (ticket)',
      searchPlaceholder: 'Ejemplo: RC-...',
      loading: 'Cargando reportes…',
      emptyAll: 'Aún no hay reportes registrados en este navegador.',
      emptySearch: 'No se encontró ningún reporte que coincida con el número de seguimiento ingresado.',
      myReportsHeading: 'Mis reportes',
      myReportsLead: 'Solicitudes creadas desde este dispositivo.',
      myReportsEmpty: 'Usted aún no ha creado reportes desde este navegador.',
      followedReportsHeading: 'Reportes que sigo',
      followedReportsLead: 'Incidentes de otros vecinos a los que usted se adhirió para recibir avisos de resolución.',
      communityHeading: 'Problemas en mi comunidad',
      communityLead: 'Seleccione un marcador en el mapa para revisar un incidente abierto y sumarse con «A mí también me afecta».',
      resolutionNoticesHeading: 'Avisos de resolución',
      openDetailAction: 'Ver detalle del reporte',
      openMunicipalCaseAction: 'Abrir expediente',
      createNewReportAction: 'Crear nuevo reporte',
      realtimeUpdatesBanner: (count) => `Hay ${count === 1 ? '1 actualización nueva' : `${count} actualizaciones nuevas`} en la bandeja.`,
      applyRealtimeUpdatesAction: 'Actualizar lista ahora',
      reorderedQueueNotice: 'Severidad actualizada. El orden de la cola se ajustó según la prioridad técnica.',
      resolvedCaseNotice: 'Incidente marcado como resuelto. Las personas suscritas verán el aviso en «Mis reportes».',
      markResolvedConfirm: '¿Marcar este incidente como resuelto? Se notificará a los vecinos suscritos en este navegador.',
      markResolvedAction: 'Marcar resuelto',
    },
    municipal: {
      filtersLegend: 'Buscar y filtrar reportes (Recepción municipal)',
      categoryFilterLabel: 'Categoría',
      allCategoriesOption: 'Todas las categorías',
      statusFilterLabel: 'Estado',
      allStatusesOption: 'Todos los estados',
      queryFilterLabel: 'Buscar por número de seguimiento o descripción',
      queryFilterPlaceholder: 'RC-... o texto del incidente',
      emptyFiltered: 'No hay reportes que coincidan con los filtros seleccionados.',
      consolidationToolbarHint: 'Seleccione dos o más reportes activos para unificarlos en un expediente principal.',
      consolidationSelectedCount: (count) => `${count} ${count === 1 ? 'reporte seleccionado' : 'reportes seleccionados'}.`,
      consolidateAction: 'Consolidar en reporte principal',
      clearSelectionAction: 'Limpiar selección',
      selectForConsolidation: 'Seleccionar',
      severityLabel: 'Severidad técnica',
      unratedSeverity: 'Sin evaluar',
      noSeverityBadge: 'Sin severidad',
      priorityIndicator: (score, supporters) => `Prioridad: ${score} pts · Respaldos: ${supporters}`,
      decisionPanelTitle: 'Dictamen y gestión municipal',
      decisionPanelHint: 'Indique la persona funcionaria responsable y la resolución de admisión o desestimación.',
      actionEvaluation: 'Marcar En evaluación',
      actionAdmit: 'Admitir a trámite',
      actionDismiss: 'Desestimar',
    },
    evidence: {
      audioAria: 'Nota de voz original del reporte',
      photoAlt: (index, total = 0) => total > 0
        ? `Foto ${index + 1} de ${total} (abre imagen original en pestaña nueva)`
        : `Fotografía de evidencia ${index + 1} (abre imagen original en pestaña nueva)`,
      mapAria: 'Mapa de ubicación del incidente',
      mapTileError: 'No se pudo cargar parte del mapa. Revise su conexión; las coordenadas siguen disponibles.',
      mapDragHint: 'Arrastre el marcador para ajustar el punto exacto del incidente.',
    },
  },
};

export function getUiCopy(tone = DEFAULT_TONE) {
  return COPY_BY_TONE[tone] || COPY_BY_TONE.usted;
}

export const uiCopy = getUiCopy(DEFAULT_TONE);

/**
 * Devuelve la información ciudadana de un estado conservando su nombre oficial
 * (Sección 4 de Recomendaciones_UX_Reporte_Ciudadano_v2.md).
 */
export function getCitizenStatusInfo(status, decision = null) {
  const official = typeof status === 'string' && status.trim()
    ? status.trim()
    : uiCopy.common.statusUnavailable;
  const normalized = official.toLocaleLowerCase();

  if (normalized.includes('registrado') || normalized.includes('recibido')) {
    return {
      official,
      citizenTitle: 'Reporte recibido',
      citizenExplanation: 'La municipalidad ya tiene su aviso.',
      dismissalReason: '',
    };
  }
  if (normalized.includes('evaluación') || normalized.includes('evaluacion')) {
    return {
      official,
      citizenTitle: official,
      citizenExplanation: 'La municipalidad está revisando su reporte.',
      dismissalReason: '',
    };
  }
  if (normalized.includes('admitido') || normalized.includes('atención') || normalized.includes('atencion') || normalized.includes('inspección')) {
    return {
      official,
      citizenTitle: official,
      citizenExplanation: 'Su reporte fue aceptado y será atendido.',
      dismissalReason: '',
    };
  }
  if (normalized.includes('desestimado') || normalized.includes('rechazado')) {
    const cause = decision?.cause ? `Causal: ${decision.cause}.` : '';
    const justification = decision?.justification ? `Motivo: ${decision.justification}` : '';
    const dismissalReason = [cause, justification].filter(Boolean).join(' ') || (decision?.publicResponse ?? '');
    return {
      official,
      citizenTitle: official,
      citizenExplanation: 'Su reporte no pudo tramitarse.',
      dismissalReason,
    };
  }
  if (normalized.includes('resuelto') || normalized.includes('cerrado')) {
    return {
      official,
      citizenTitle: official,
      citizenExplanation: 'La municipalidad marcó este problema como resuelto.',
      dismissalReason: '',
    };
  }
  return {
    official,
    citizenTitle: official,
    citizenExplanation: '',
    dismissalReason: '',
  };
}
