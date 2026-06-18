import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

export default function Carrinho() {
  const { items, removeItem, updateQty, clearCart, total, itemCount } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  function handleCheckout() {
    if (items.length === 0) return
    if (!user) {
      toast.error('Faça login para finalizar o pedido.')
      navigate('/login')
      return
    }
    navigate('/checkout')
  }

  const totalPix = total * 0.95

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/catalogo" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Continuar comprando
          </Link>
          <Link to="/" className="text-lg font-bold text-gradient">Bola AI Express</Link>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ShoppingCart className="h-4 w-4" /> {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 pt-24 pb-12">
        <h1 className="mb-8 text-3xl font-bold">🛒 Seu Carrinho</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag className="mb-6 h-20 w-20 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Carrinho vazio</h2>
            <p className="mt-2 text-muted-foreground">Adicione produtos do catálogo para continuar.</p>
            <Link to="/catalogo" className="mt-8 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90">
              Ver Catálogo
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Items list */}
            <div className="space-y-4 lg:col-span-2">
              {items.map(item => (
                <div key={item.productId} className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                    {item.imagem ? (
                      <img src={item.imagem} alt={item.nome} className="h-full w-full object-cover" />
                    ) : (
                      <ShoppingBag className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.nome}</p>
                    <p className="text-sm text-primary font-bold">R$ {item.preco.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.productId, item.qtd - 1)} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.qtd}</span>
                    <button onClick={() => updateQty(item.productId, item.qtd + 1)} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <p className="font-bold">R$ {item.subtotal.toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-destructive transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={() => { clearCart(); toast.success('Carrinho limpo!') }} className="text-sm text-muted-foreground hover:text-destructive transition flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Limpar carrinho
              </button>
            </div>

            {/* Summary */}
            <div className="glass rounded-2xl p-6 h-fit sticky top-24">
              <h2 className="mb-4 text-lg font-bold">Resumo do pedido</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-400">
                  <span>Desconto PIX (5%)</span>
                  <span>-R$ {(total * 0.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Entrega</span>
                  <span>A calcular</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                  <span>Total (PIX)</span>
                  <span className="text-primary">R$ {totalPix.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
              >
                Finalizar Pedido
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">🔒 Pagamento 100% seguro</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}