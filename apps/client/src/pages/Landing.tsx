import { Link } from 'react-router-dom'
import { ShoppingBag, Zap, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/bolaaia.png" alt="Bola AI" className="h-8 w-8 rounded-full" />
            <span className="text-xl font-bold text-gradient">Bola AI Express</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/catalogo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Catálogo
            </Link>
            {user ? (
              <>
                <Link to="/meus-pedidos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Meus Pedidos
                </Link>
                <Link to="/perfil" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Perfil
                </Link>
                <button
                  onClick={signOut}
                  className="text-sm text-destructive hover:text-destructive/80 transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Entrar
              </Link>
            )}
            <Link
              to="/catalogo"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Fazer Pedido
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="relative z-10 text-center">
          <img src="/bolaaia.png" alt="Bola AI Express" className="mx-auto mb-6 h-32 w-32 rounded-2xl shadow-2xl" />
          <h1 className="text-5xl font-bold md:text-7xl">
            <span className="text-gradient">Bola AI Express</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Delivery de pods e cigarros eletrônicos. Rápido, prático e com os melhores preços.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/catalogo"
              className="rounded-xl bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-105"
            >
              Ver Cardápio
            </Link>
            {user ? (
              <Link
                to="/meus-pedidos"
                className="rounded-xl border border-border px-8 py-3 text-lg font-semibold hover:bg-accent transition-all"
              >
                Meus Pedidos
              </Link>
            ) : (
              <Link
                to="/cadastro"
                className="rounded-xl border border-border px-8 py-3 text-lg font-semibold hover:bg-accent transition-all"
              >
                Criar Conta
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold">Por que escolher a Bola AI?</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            { icon: Zap, title: 'Entrega Rápida', desc: 'Receba em minutos na sua porta.' },
            { icon: ShoppingBag, title: 'Melhores Marcas', desc: 'Produtos originais e de qualidade.' },
            { icon: Shield, title: 'Pagamento Seguro', desc: 'PIX com 5% de desconto.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-6 text-center">
              <Icon className="mx-auto mb-4 h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 Bola AI Express. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}