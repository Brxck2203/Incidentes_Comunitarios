export default function HomePage() {
  return (
    <section className="welcome-panel" aria-labelledby="page-title">
      <p className="eyebrow">Sistema de Gestión y Reporte de Incidentes Comunitarios</p>
      <h1 id="page-title">Una comunidad mejor conectada</h1>
      <p className="lead">
        Un espacio para demostrar cómo la ciudadanía podría reportar incidentes
        y consultar el seguimiento de su atención.
      </p>
      <aside className="notice" aria-labelledby="prototype-title">
        <h2 id="prototype-title">Base inicial del prototipo</h2>
        <p>
          Las pantallas e interacciones se incorporarán progresivamente según
          los requerimientos validados en cada sprint. Esta versión todavía
          no permite registrar ni gestionar reportes.
        </p>
      </aside>
      <p className="safety-note">
        Esta plataforma no atiende emergencias ni envía reportes reales a una municipalidad.
      </p>
    </section>
  );
}
