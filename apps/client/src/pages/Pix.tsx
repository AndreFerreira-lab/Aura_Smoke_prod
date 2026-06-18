import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@bola/firebase-config/client'
import { CheckCircle, Copy, Clock, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function Pix() {
  const { orderId } = useParams()
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15 * 60) // 15 min
  const [order, setOrder] = useState<{ total?: number; clienteNome?: string } | null>(null)

  useEffect(() => {
    if (!orderId) return
    getDoc(doc(db, 'orders', orderId)).then(snap => {
      if (snap.exists()) setOrder(snap.data())
    }).catch(() => {})
  }, [orderId])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => (t <= 0 ? 0 : t - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')

  // Demo PIX key for display purposes
  const pixKey = `00020126580014br.gov.bcb.pix0136bola-ai-express-pix-key@gmail.com5204000053039865802BR5913BolaAIExpress6009SAO PAULO62070503***6304ABCD`

  function copyPix() {
    navigator.clipboard.writeText(pixKey).then(() => {
      setCopied(true)
      toast.success('Código PIX copiado!')
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md slide-up">
        <div className="glass rounded-2xl p-8 text-center">
          {/* Header */}
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Pedido #{orderId}</h1>
            <p className="mt-1 text-muted-foreground">Aguardando pagamento PIX</p>
          </div>

          {/* Timer */}
          <div className={`mb-6 flex items-center justify-center gap-2 rounded-xl p-3 ${timeLeft < 120 ? 'bg-red-500/10 text-red-400' : 'bg-secondary'}`}>
            <Clock className="h-4 w-4" />
            <span className="font-mono text-lg font-bold">{minutes}:{seconds}</span>
            <span className="text-sm text-muted-foreground">restantes</span>
          </div>

          {/* Amount */}
          {order?.total && (
            <div className="mb-6 rounded-xl bg-primary/10 border border-primary/30 p-4">
              <p className="text-sm text-muted-foreground">Valor a pagar</p>
              <p className="text-3xl font-bold text-primary">R$ {order.total.toFixed(2)}</p>
              <p className="text-xs text-green-400 mt-1">✓ 5% de desconto PIX aplicado</p>
            </div>
          )}

          {/* QR Code placeholder */}
          <div className="mb-6 mx-auto h-48 w-48 rounded-xl bg-white p-3 flex items-center justify-center">
            <div className="grid grid-cols-7 gap-0.5 w-full h-full">
              {Array.from({ length: 49 }).map((_, i) => (
                <div key={i} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-black' : 'bg-white'}`} />
              ))}
            </div>
          </div>

          <p className="mb-3 text-sm text-muted-foreground">Ou copie o código PIX Copia e Cola:</p>

          {/* PIX Key */}
          <div className="mb-6 rounded-xl bg-secondary/50 border border-border p-3">
            <p className="text-xs text-muted-foreground break-all font-mono leading-relaxed">
              {pixKey.slice(0, 60)}...
            </p>
          </div>

          <button
            onClick={copyPix}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition ${copied ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90'}`}
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copiado!' : 'Copiar código PIX'}
          </button>

          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p>1. Abra o app do seu banco</p>
            <p>2. Escolha pagar via PIX Copia e Cola</p>
            <p>3. Cole o código e confirme o pagamento</p>
          </div>

          <Link to="/meus-pedidos" className="mt-6 flex items-center justify-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-3 w-3" /> Ver meus pedidos
          </Link>
        </div>
      </div>
    </div>
  )
}