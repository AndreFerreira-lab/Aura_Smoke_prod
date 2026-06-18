import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0a0a14', color: '#e2e8f0', padding: '2rem', fontFamily: 'monospace'
        }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#f87171' }}>
              Erro de Inicialização
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
              {this.state.error?.message || 'Erro desconhecido'}
            </p>
            <pre style={{
              background: '#1e1e2e', border: '1px solid #334155',
              borderRadius: '0.5rem', padding: '1rem',
              fontSize: '0.75rem', overflowX: 'auto', color: '#e2e8f0',
              maxHeight: '300px', overflowY: 'auto'
            }}>
              {this.state.error?.stack || 'Sem stack trace'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1rem', padding: '0.75rem 2rem',
                background: '#7c3aed', color: 'white',
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '0.875rem'
              }}
            >
              🔄 Recarregar Página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
