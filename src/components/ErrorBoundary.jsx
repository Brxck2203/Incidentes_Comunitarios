import { Component } from 'react';
import { uiCopy } from '../constants/uiCopy.js';

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
          <h1>{uiCopy.errorBoundary.title}</h1>
          <p>{uiCopy.errorBoundary.description}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {uiCopy.errorBoundary.reloadAction}
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
