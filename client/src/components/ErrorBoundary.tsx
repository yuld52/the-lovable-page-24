import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-destructive/20 rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Oops! Algo deu errado</h2>
            <p className="text-muted-foreground text-center mb-6">
              {this.state.error?.message || "Ocorreu um erro inesperado."}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 bg-primary text-white h-11 rounded-lg font-medium"
              >
                Recarregar Página
              </button>
              <button 
                onClick={() => window.location.href = "/"}
                className="flex-1 bg-secondary text-foreground h-11 rounded-lg font-medium"
              >
                Ir para o Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}