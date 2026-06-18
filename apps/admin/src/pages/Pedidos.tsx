import { useEffect, useState } from 'react'
import { collection, query, orderBy, getDocs, doc, updateDoc, limit, startAfter, type QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '@bola/firebase-config/client'
import { Search, RefreshCw, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import type { Order } from '@bola/shared-types'

const ALL_STATUSES = ['pendente', 'confirmado', 'preparando', 'saiu_entrega', 'entregue', 'cancelado']

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string }> = {
  pendente:     { label: 'Pendente',         color: 'text-yellow-400 bg-yellow-400/10', next: 'confirmado' },
  confirmado:   { label: 'Confirmado',       color: 'text-blue-400 bg-blue-400/10',     next: 'preparando' },
  preparando:   { label: 'Preparando',       color: 'text-purple-400 bg-purple-400/10', next: 'saiu_entrega' },
  saiu_entrega: { label: 'Saiu p/ entrega', color: 'text-orange-400 bg-orange-400/10', next: 'entregue' },
  entregue:     { label: 'Entregue',         color: 'text-green-400 bg-green-400/10' },
  cancelado:    { label: 'Cancelado',        color: 'text-red-400 bg-red-400/10' },
}

export default function Pedidos() {
  const [orders, setOrders] = useState<(Order & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [updating, setUpdating] = useState<string | null>(null)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)

  async function fetchOrders(reset = true) {
    setLoading(true)
    try {
      let q = query(collection(db, 'orders'), orderBy('dataIso', 'desc'), limit(20))
      if (!reset && lastDoc) q = query(collection(db, 'orders'), orderBy('dataIso', 'desc'), startAfter(lastDoc), limit(20))

      const snap = await getDocs(q)
      const list: (Order & { id: string })[] = []
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Order & { id: string }))
      setOrders(prev => reset ? list : [...prev, ...list])
      setLastDoc(snap.docs[snap.docs.length - 1] || null)
      setHasMore(snap.size === 20)
    } catch (e) {
      console.error(e)
      setOrders(DEMO_ORDERS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [])

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdating(orderId)
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o))
      toast.success(`Status atualizado: ${STATUS_CONFIG[newStatus]?.label}`)
    } catch {
      toast.error('Erro ao atualizar status.')
    } finally {
      setUpdating(null)
    }
  }

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.clienteNome.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase()) || o.clienteTelefone?.includes(search)
    const matchStatus = filterStatus === 'todos' || o.status === filterStatus
    return matchSearch && matchStatus
  })

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} pedido(s) encontrado(s)</p>
        </div>
        <button onClick={() => fetchOrders()} className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm hover:bg-accent transition">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, ID, telefone..."
            className="w-full rounded-xl bg-secondary/60 border border-border pl-10 pr-4 py-2.5 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none rounded-xl bg-secondary/60 border border-border pl-4 pr-8 py-2.5 text-sm outline-none focus:border-primary transition cursor-pointer"
          >
            <option value="todos">Todos os status</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Orders table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted-foreground">
                {['#ID', 'Cliente', 'Telefone', 'Itens', 'Total', 'Pagamento', 'Data', 'Status', 'Ação'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-secondary animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Nenhum pedido encontrado.</td></tr>
              ) : filtered.map(order => {
                const cfg = STATUS_CONFIG[order.status]
                const nextStatus = cfg?.next
                return (
                  <tr key={order.id} className="hover:bg-secondary/20 transition">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{order.clienteNome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.clienteTelefone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.itens?.length || 0}</td>
                    <td className="px-4 py-3 font-semibold text-primary whitespace-nowrap">R$ {order.total?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {order.formaPagamento === 'pix' ? '💸 PIX' : '💵 Dinheiro'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(order.dataIso)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cfg?.color || 'bg-secondary text-muted-foreground'}`}>
                        {cfg?.label || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {nextStatus && (
                        <button
                          onClick={() => updateStatus(order.id, nextStatus)}
                          disabled={updating === order.id}
                          className="rounded-lg bg-primary/15 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/25 transition whitespace-nowrap disabled:opacity-50"
                        >
                          {updating === order.id ? '...' : `→ ${STATUS_CONFIG[nextStatus]?.label}`}
                        </button>
                      )}
                      {order.status === 'pendente' && (
                        <button
                          onClick={() => updateStatus(order.id, 'cancelado')}
                          disabled={updating === order.id}
                          className="ml-1 rounded-lg bg-red-400/10 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-400/20 transition"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center">
          <button onClick={() => fetchOrders(false)} className="rounded-xl border border-border px-6 py-2 text-sm hover:bg-secondary transition">
            Carregar mais
          </button>
        </div>
      )}
    </div>
  )
}

const DEMO_ORDERS: (Order & { id: string })[] = [
  { id: 'ABC12345DEMO', clienteNome: 'João Silva', clienteTelefone: '11999999999', clienteEndereco: 'Rua A, 100', itens: [{ productId: '1', nome: 'Pod Vaporesso', preco: 189.90, qtd: 1, subtotal: 189.90 }], subtotal: 189.90, total: 180.41, taxaEntrega: 0, desconto: 9.49, formaPagamento: 'pix', status: 'pendente', origem: 'site', dataIso: new Date().toISOString(), clienteUid: '1' },
  { id: 'DEF67890DEMO', clienteNome: 'Maria Santos', clienteTelefone: '11988888888', clienteEndereco: 'Rua B, 200', itens: [{ productId: '2', nome: 'Elf Bar 600', preco: 59.90, qtd: 2, subtotal: 119.80 }], subtotal: 119.80, total: 119.80, taxaEntrega: 0, desconto: 0, formaPagamento: 'dinheiro', status: 'preparando', origem: 'whatsapp', dataIso: new Date().toISOString(), clienteUid: '2' },
]
