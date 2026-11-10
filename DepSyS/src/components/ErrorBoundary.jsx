import React from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary atrapó un error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white border border-red-200 rounded-3xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-heading font-black text-zinc-900 mb-2">
            No se pudo cargar este apartado
          </h2>
          <p className="text-xs text-zinc-500 font-mono max-w-md mb-6">
            {this.state.error?.message || 'Error inesperado durante la representación del módulo.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-heading font-bold transition-colors tap-active"
            >
              <RefreshCw className="w-4 h-4 text-zinc-600" />
              <span>Reintentar</span>
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onGoHome) this.props.onGoHome();
                else window.location.reload();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#e60000] hover:bg-red-700 text-white rounded-xl text-xs font-heading font-bold transition-colors tap-active shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Menú Principal</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
