import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from '@bola/firebase-config/client'
import { useAuth } from '../context/AuthContext'
import { Package, ArrowLeft, Clock, ChevronRight } from 'lucide-react'
import type { Order } from '@bola/shared-types'

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  pendente:     { label: 'Pendente',       color: 'text-yellow-400 bg-yellow-400/10',  emoji: '⏳' },
  confirmado:   { label: 'Confirmado',     color: 'text-blue-400 bg-blue-400/10',     emoji: '✅' },
  preparando:   { label: 'Preparando',     color: 'text-purple-400 bg-purple-400/10', emoji: '👨‍🍳' },
  saiu_entrega: { label: 'Saiu p/ entrega',color: 'text-orange-400 bg-orange-400/10',emoji: '🚀' },
  entregue:     { label: 'Entregue',       color: 'text-green-400 bg-green-400/10',   emoji: '🎉' },
  cancelado:    { label: 'Cancelado',      color: 'text-red-400 bg-red-400/10',       emoji: '❌' },
}

export default function MeusPedidos() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<(Order & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'orders'),
      where('clienteUid', '==', user.uid),
      orderBy('dataIso', 'desc'),
      limit(20)
    )
    getDocs(q).then(snap => {
      const list: (Order & { id: string })[] = []
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Order & { id: string }))
      setOrders(list)
    }).catch(console.error).finally(() => setLoading(false))
  }, [user])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Início
          </Link>
          <span className="font-bold text-gradient">Meus Pedidos</span>
          <div />
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 pt-24 pb-12">
        <h1 className="mb-6 text-3xl font-bold">📦 Meus Pedidos</h1>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                <div className="mb-3 h-5 w-1/3 rounded bg-secondary" />
                <div className="h-4 w-1/2 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Nenhum pedido ainda</h2>
            <p className="mt-2 text-muted-foreground">Faça seu primeiro pedido agora!</p>
            <Link to="/catalogo" className="mt-6 rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition">
              Ver Catálogo
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const status = STATUS_CONFIG[order.status] || { label: order.status, color: 'text-muted-foreground bg-secondary', emoji: '📦' }
              return (
                <Link key={order.id} to={`/pedido/${order.id}`} className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-primary/50 transition group block">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-xl">
                    {status.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.itens?.length || 0} {order.itens?.length === 1 ? 'item' : 'itens'} • R$ {order.total?.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" /> {formatDate(order.dataIso)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}