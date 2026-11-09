import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return <section><h1>Página no encontrada</h1><p>Revisa la dirección o vuelve al inicio.</p><Link className="button-link" to="/">Volver al inicio</Link></section>;
}
