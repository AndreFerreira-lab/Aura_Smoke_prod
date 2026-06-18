import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@bola/firebase-config/client'
import { ShoppingBag, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import type { Order } from '@bola/shared-types'

interface Stats {
  totalHoje: number
  pedidosHoje: number
  pedidosPendentes: number
  totalMes: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalHoje: 0, pedidosHoje: 0, pedidosPendentes: 0, totalMes: 0 })
  const [recentOrders, setRecentOrders] = useState<(Order & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const [todaySnap, pendingSnap, monthSnap, recentSnap] = await Promise.all([
          getDocs(query(collection(db, 'orders'), where('dataIso', '>=', todayStart))),
          getDocs(query(collection(db, 'orders'), where('status', '==', 'pendente'))),
          getDocs(query(collection(db, 'orders'), where('dataIso', '>=', monthStart), where('status', 'in', ['confirmado', 'preparando', 'saiu_entrega', 'entregue']))),
          getDocs(query(collection(db, 'orders'), orderBy('dataIso', 'desc'), limit(8))),
        ])

        let totalHoje = 0
        todaySnap.forEach(d => { const o = d.data() as Order; if (o.status !== 'cancelado') totalHoje += o.total })

        let totalMes = 0
        monthSnap.forEach(d => { const o = d.data() as Order; totalMes += o.total })

        const recent: (Order & { id: string })[] = []
        recentSnap.forEach(d => recent.push({ id: d.id, ...d.data() } as Order & { id: string }))

        setStats({ totalHoje, pedidosHoje: todaySnap.size, pedidosPendentes: pendingSnap.size, totalMes })
        setRecentOrders(recent)
      } catch (e) {
        console.error(e)
        // Demo data when Firebase not configured
        setStats({ totalHoje: 1247.50, pedidosHoje: 8, pedidosPendentes: 3, totalMes: 24890.00 })
        setRecentOrders(DEMO_ORDERS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const STATUS_BADGE: Record<string, string> = {
    pendente: 'bg-yellow-400/15 text-yellow-400',
    confirmado: 'bg-blue-400/15 text-blue-400',
    preparando: 'bg-purple-400/15 text-purple-400',
    saiu_entrega: 'bg-orange-400/15 text-orange-400',
    entregue: 'bg-green-400/15 text-green-400',
    cancelado: 'bg-red-400/15 text-red-400',
  }
  const STATUS_LABEL: Record<string, string> = {
    pendente: 'Pendente', confirmado: 'Confirmado', preparando: 'Preparando',
    saiu_entrega: 'Entregue', entregue: 'Entregue', cancelado: 'Cancelado',
  }

  const cards = [
    { title: 'Vendas Hoje', value: `R$ ${stats.totalHoje.toFixed(2)}`, sub: `${stats.pedidosHoje} pedidos`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
    { title: 'Vendas no Mês', value: `R$ ${stats.totalMes.toFixed(2)}`, sub: 'Pedidos confirmados', icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Pendentes', value: String(stats.pedidosPendentes), sub: 'Aguardando ação', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { title: 'Entregues Hoje', value: String(stats.pedidosHoje), sub: 'Total do dia', icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  ]

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, value, sub, icon: Icon, color, bg }) => (
          <div key={title} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className={`mt-1 text-2xl font-bold ${loading ? 'animate-pulse text-muted-foreground' : ''}`}>
                  {loading ? '—' : value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Pedidos Recentes</h2>
          <a href="/pedidos" className="text-xs text-primary hover:underline">Ver todos →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">#ID</th>
                <th className="pb-3 pr-4 font-medium">Cliente</th>
                <th className="pb-3 pr-4 font-medium">Total</th>
                <th className="pb-3 pr-4 font-medium">Pagamento</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="py-3 pr-4"><div className="h-4 rounded bg-secondary animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-secondary/30 transition">
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="py-3 pr-4 font-medium">{order.clienteNome}</td>
                  <td className="py-3 pr-4 font-semibold text-primary">R$ {order.total.toFixed(2)}</td>
                  <td className="py-3 pr-4 text-muted-foreground capitalize">
                    {order.formaPagamento === 'pix' ? '💸 PIX' : order.formaPagamento === 'dinheiro' ? '💵 Dinheiro' : order.formaPagamento}
                  </td>
                  <td className="py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[order.status] || 'bg-secondary text-muted-foreground'}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const DEMO_ORDERS: (Order & { id: string })[] = [
  { id: 'ABC12345', clienteNome: 'João Silva', clienteTelefone: '11999999999', clienteEndereco: 'Rua A, 100', itens: [], subtotal: 189.90, total: 180.41, taxaEntrega: 0, desconto: 9.49, formaPagamento: 'pix', status: 'pendente', origem: 'site', dataIso: new Date().toISOString(), clienteUid: '1' },
  { id: 'DEF67890', clienteNome: 'Maria Santos', clienteTelefone: '11988888888', clienteEndereco: 'Rua B, 200', itens: [], subtotal: 59.90, total: 59.90, taxaEntrega: 0, desconto: 0, formaPagamento: 'dinheiro', status: 'preparando', origem: 'whatsapp', dataIso: new Date().toISOString(), clienteUid: '2' },
  { id: 'GHI11111', clienteNome: 'Pedro Costa', clienteTelefone: '11977777777', clienteEndereco: 'Rua C, 300', itens: [], subtotal: 229.90, total: 218.41, taxaEntrega: 0, desconto: 11.49, formaPagamento: 'pix', status: 'entregue', origem: 'site', dataIso: new Date().toISOString(), clienteUid: '3' },
]
