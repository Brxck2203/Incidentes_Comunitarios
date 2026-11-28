import { useMemo } from 'react';
import { buildAuditHistory } from '../services/auditHistory.js';

function formatDateTime(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleString('es-CR');
}

export default function AuditHistoryTab({ report }) {
  const entries = useMemo(() => buildAuditHistory(report), [report]);

  if (!report) return null;

  return (
    <section
      className="audit-history-panel"
      role="tabpanel"
      id="panel-historial-auditoria"
      aria-labelledby="tab-historial-auditoria"
    >
      <div className="audit-history-header">
        <h2>Historial de Auditoría del expediente</h2>
        <span className="audit-readonly-badge" role="status">
          Registro inmutable de solo lectura
        </span>
      </div>

      <p className="audit-history-lead">
        Bitácora cronológica completa de movimientos, cambios de estado y observaciones técnicas registrados sobre el
        expediente <strong>{report.ticket}</strong> desde su recepción.
      </p>

      {entries.length === 0 ? (
        <p role="status">No hay movimientos registrados en la bitácora de este expediente.</p>
      ) : (
        <ol className="audit-history-list" aria-label="Movimientos de auditoría en orden cronológico">
          {entries.map((item) => (
            <li key={item.id} className="audit-history-card">
              <div className="audit-history-card-top">
                <span className="audit-sequence-pill">Movimiento #{item.sequence}</span>
                <span className="audit-timestamp">{formatDateTime(item.at)}</span>
              </div>

              <h3 className="audit-event-title">{item.event}</h3>

              <dl className="audit-metadata-grid">
                <div>
                  <dt>Responsable (funcionario o cuadrilla)</dt>
                  <dd><strong>{item.actor}</strong></dd>
                </div>
                <div>
                  <dt>Rol</dt>
                  <dd>{item.role}</dd>
                </div>
                <div>
                  <dt>Estado anterior</dt>
                  <dd>{item.previousStatus}</dd>
                </div>
                <div>
                  <dt>Estado nuevo</dt>
                  <dd><strong>{item.newStatus}</strong></dd>
                </div>
              </dl>

              <p className="audit-observation preserve-lines">
                <strong>Observación técnica / Detalle:</strong> {item.observation}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
