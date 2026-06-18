import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@bola/firebase-config/client'
import { ArrowLeft, MapPin, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, total, clearCart } = useCart()
  const { user } = useAuth()
  const [step, setStep] = useState<'endereco' | 'pagamento'>('endereco')
  const [loading, setLoading] = useState(false)

  const [endereco, setEndereco] = useState({
    rua: user?.profile?.endereco || '',
    numero: user?.profile?.numero || '',
    complemento: '',
    bairro: user?.profile?.bairro || '',
    cidade: user?.profile?.cidade || '',
    cep: user?.profile?.cep || '',
  })
  const [pagamento, setPagamento] = useState<'pix' | 'dinheiro'>('pix')
  const [troco, setTroco] = useState('')

  const desconto = pagamento === 'pix' ? total * 0.05 : 0
  const totalFinal = total - desconto

  function enderecoCompleto() {
    return `${endereco.rua}, ${endereco.numero}${endereco.complemento ? ' ' + endereco.complemento : ''} - ${endereco.bairro} - ${endereco.cidade} - CEP ${endereco.cep}`
  }

  async function handleConfirmar() {
    if (!user) return
    setLoading(true)
    try {
      const orderId = Math.random().toString(36).substring(2, 10).toUpperCase()
      const order = {
        clienteUid: user.uid,
        clienteNome: user.profile.nome,
        clienteTelefone: user.profile.telefone,
        clienteEndereco: enderecoCompleto(),
        itens: items.map(i => ({ productId: i.productId, nome: i.nome, preco: i.preco, qtd: i.qtd, subtotal: i.subtotal })),
        subtotal: total,
        total: totalFinal,
        taxaEntrega: 0,
        desconto,
        formaPagamento: pagamento,
        status: 'pendente',
        origem: 'site',
        dataIso: new Date().toISOString(),
      }
      await addDoc(collection(db, 'orders'), order)
      clearCart()
      if (pagamento === 'pix') {
        navigate(`/pix/${orderId}`)
      } else {
        toast.success('Pedido realizado com sucesso! 🎉')
        navigate('/meus-pedidos')
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao processar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Seu carrinho está vazio.</p>
          <Link to="/catalogo" className="mt-4 inline-block text-primary hover:underline">Ver catálogo</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button onClick={() => step === 'pagamento' ? setStep('endereco') : navigate('/carrinho')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <span className="font-bold text-gradient">Checkout</span>
          <div />
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 pt-24 pb-12">
        {/* Steps */}
        <div className="mb-8 flex gap-4">
          {(['endereco', 'pagamento'] as const).map((s, i) => (
            <div key={s} className={`flex items-center gap-2 text-sm font-medium ${step === s ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === s ? 'bg-primary text-primary-foreground' : step === 'pagamento' && s === 'endereco' ? 'bg-green-500 text-white' : 'bg-secondary'}`}>
                {step === 'pagamento' && s === 'endereco' ? '✓' : i + 1}
              </span>
              {s === 'endereco' ? 'Endereço' : 'Pagamento'}
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {step === 'endereco' && (
              <div className="glass rounded-2xl p-6">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
                  <MapPin className="h-5 w-5 text-primary" /> Endereço de entrega
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: 'Rua / Avenida', key: 'rua', placeholder: 'Rua Exemplo', full: true },
                    { label: 'Número', key: 'numero', placeholder: '123', full: false },
                    { label: 'Complemento', key: 'complemento', placeholder: 'Apto 4B', full: false },
                    { label: 'Bairro', key: 'bairro', placeholder: 'Centro', full: false },
                    { label: 'Cidade', key: 'cidade', placeholder: 'São Paulo', full: false },
                    { label: 'CEP', key: 'cep', placeholder: '00000-000', full: false },
                  ].map(({ label, key, placeholder, full }) => (
                    <div key={key} className={full ? 'sm:col-span-2' : ''}>
                      <label className="mb-1.5 block text-sm font-medium">{label}</label>
                      <input
                        type="text"
                        value={endereco[key as keyof typeof endereco]}
                        onChange={e => setEndereco(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { if (!endereco.rua || !endereco.numero) { toast.error('Preencha rua e número.'); return } setStep('pagamento') }}
                  className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90"
                >
                  Continuar →
                </button>
              </div>
            )}

            {step === 'pagamento' && (
              <div className="glass rounded-2xl p-6">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
                  <CreditCard className="h-5 w-5 text-primary" /> Forma de pagamento
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setPagamento('pix')}
                    className={`w-full rounded-xl border p-4 text-left transition ${pagamento === 'pix' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">💸 PIX</p>
                        <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                      </div>
                      <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">5% OFF</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setPagamento('dinheiro')}
                    className={`w-full rounded-xl border p-4 text-left transition ${pagamento === 'dinheiro' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                  >
                    <p className="font-semibold">💵 Dinheiro na entrega</p>
                    <p className="text-sm text-muted-foreground">Pague quando receber</p>
                  </button>
                </div>
                {pagamento === 'dinheiro' && (
                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium">Troco para (opcional)</label>
                    <input type="text" value={troco} onChange={e => setTroco(e.target.value)} placeholder="Ex: R$ 100,00" className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
                  </div>
                )}
                <button
                  onClick={handleConfirmar}
                  disabled={loading}
                  className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Processando...' : `Confirmar Pedido — R$ ${totalFinal.toFixed(2)}`}
                </button>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="glass rounded-2xl p-5 h-fit">
            <h3 className="mb-4 font-bold">Resumo</h3>
            <div className="space-y-2 text-sm">
              {items.map(i => (
                <div key={i.productId} className="flex justify-between">
                  <span className="text-muted-foreground truncate max-w-[140px]">{i.qtd}x {i.nome}</span>
                  <span>R$ {i.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>R$ {total.toFixed(2)}</span>
                </div>
                {desconto > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Desconto PIX</span><span>-R$ {desconto.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span><span className="text-primary">R$ {totalFinal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}