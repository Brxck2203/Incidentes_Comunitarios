import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error de renderizado del prototipo:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-screen" role="alert">
          <h1>No pudimos mostrar esta pantalla</h1>
          <p>Recarga la aplicación para volver a intentarlo.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Recargar aplicación
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
