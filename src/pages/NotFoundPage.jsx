import { Link } from 'react-router-dom';
import { uiCopy } from '../constants/uiCopy.js';

export default function NotFoundPage() {
  return <section>
    <h1>{uiCopy.notFound.title}</h1>
    <p>{uiCopy.notFound.description}</p>
    <Link className="button-link" to="/">{uiCopy.notFound.backHome}</Link>
  </section>;
}
