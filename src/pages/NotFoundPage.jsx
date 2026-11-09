import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="welcome-panel" aria-labelledby="not-found-title">
      <p className="eyebrow">Error 404</p>
      <h1 id="not-found-title">Página no encontrada</h1>
      <p>La dirección no existe o todavía no forma parte del prototipo.</p>
      <Link className="button-link" to="/">Volver al inicio</Link>
    </section>
  );
}
