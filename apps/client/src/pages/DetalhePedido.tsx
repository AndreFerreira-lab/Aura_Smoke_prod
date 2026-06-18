import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@bola/firebase-config/client'
import { ArrowLeft, MapPin, CreditCard, Package } from 'lucide-react'
import type { Order } from '@bola/shared-types'

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string; step: number }> = {
  pendente:     { label: 'Pendente',        color: 'text-yellow-400', emoji: '⏳', step: 1 },
  confirmado:   { label: 'Confirmado',      color: 'text-blue-400',   emoji: '✅', step: 2 },
  preparando:   { label: 'Preparando',      color: 'text-purple-400', emoji: '👨‍🍳', step: 3 },
  saiu_entrega: { label: 'Saiu p/ entrega', color: 'text-orange-400', emoji: '🚀', step: 4 },
  entregue:     { label: 'Entregue',        color: 'text-green-400',  emoji: '🎉', step: 5 },
  cancelado:    { label: 'Cancelado',       color: 'text-red-400',    emoji: '❌', step: 0 },
}

const STEPS = ['Pendente', 'Confirmado', 'Preparando', 'Saiu p/ entrega', 'Entregue']

export default function DetalhePedido() {
  const { id } = useParams()
  const [order, setOrder] = useState<(Order & { id: string }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'orders', id))
      .then(snap => { if (snap.exists()) setOrder({ id: snap.id, ...snap.data() } as Order & { id: string }) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground flex-col gap-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Link to="/meus-pedidos" className="text-primary hover:underline">Ver meus pedidos</Link>
      </div>
    )
  }

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG['pendente']

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/meus-pedidos" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Meus Pedidos
          </Link>
          <span className="font-bold">Pedido #{order.id.slice(0, 8).toUpperCase()}</span>
          <div />
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-4 pt-24 pb-12 space-y-6">
        {/* Status card */}
        <div className="glass rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">{status.emoji}</div>
          <h2 className={`text-2xl font-bold ${status.color}`}>{status.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(order.dataIso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Progress bar (não mostrar para cancelado) */}
        {order.status !== 'cancelado' && (
          <div className="glass rounded-2xl p-5">
            <div className="relative flex justify-between">
              <div className="absolute top-3 left-0 right-0 h-0.5 bg-border" />
              <div
                className="absolute top-3 left-0 h-0.5 bg-primary transition-all duration-700"
                style={{ width: `${((status.step - 1) / (STEPS.length - 1)) * 100}%` }}
              />
              {STEPS.map((s, i) => (
                <div key={s} className="relative flex flex-col items-center gap-1">
                  <div className={`z-10 h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${i < status.step ? 'bg-primary border-primary text-white' : 'bg-background border-border text-muted-foreground'}`}>
                    {i < status.step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs text-center max-w-[60px] ${i < status.step ? 'text-primary' : 'text-muted-foreground'}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 flex items-center gap-2 font-bold">
            <Package className="h-4 w-4 text-primary" /> Itens do pedido
          </h3>
          <div className="space-y-3">
            {order.itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.nome}</p>
                  <p className="text-sm text-muted-foreground">{item.qtd}x R$ {item.preco.toFixed(2)}</p>
                </div>
                <p className="font-semibold">R$ {item.subtotal.toFixed(2)}</p>
              </div>
            ))}
            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>R$ {order.subtotal.toFixed(2)}</span>
              </div>
              {order.desconto > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Desconto PIX</span><span>-R$ {order.desconto.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span><span className="text-primary">R$ {order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery + Payment */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass rounded-2xl p-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <MapPin className="h-4 w-4 text-primary" /> Endereço
            </h4>
            <p className="text-sm text-muted-foreground">{order.clienteEndereco}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <CreditCard className="h-4 w-4 text-primary" /> Pagamento
            </h4>
            <p className="text-sm text-muted-foreground capitalize">
              {order.formaPagamento === 'pix' ? '💸 PIX' : order.formaPagamento === 'dinheiro' ? '💵 Dinheiro' : order.formaPagamento}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}