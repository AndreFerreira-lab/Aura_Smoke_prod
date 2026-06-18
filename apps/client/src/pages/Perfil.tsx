import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@bola/firebase-config/client'
import { Link } from 'react-router-dom'
import { ArrowLeft, User, LogOut, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function Perfil() {
  const { user, firebaseUser, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: user?.profile?.nome || '',
    telefone: user?.profile?.telefone || '',
    endereco: user?.profile?.endereco || '',
    numero: user?.profile?.numero || '',
    complemento: user?.profile?.complemento || '',
    bairro: user?.profile?.bairro || '',
    cidade: user?.profile?.cidade || '',
    cep: user?.profile?.cep || '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        profile: { ...user.profile, ...form },
        updatedAt: new Date().toISOString(),
      })
      toast.success('Perfil atualizado com sucesso!')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
  }

  const fields = [
    { label: 'Nome completo', key: 'nome', type: 'text', placeholder: 'Seu nome', full: true },
    { label: 'Telefone / WhatsApp', key: 'telefone', type: 'tel', placeholder: '(11) 99999-9999', full: false },
    { label: 'Rua / Avenida', key: 'endereco', type: 'text', placeholder: 'Rua Exemplo', full: false },
    { label: 'Número', key: 'numero', type: 'text', placeholder: '123', full: false },
    { label: 'Complemento', key: 'complemento', type: 'text', placeholder: 'Apto, Bloco...', full: false },
    { label: 'Bairro', key: 'bairro', type: 'text', placeholder: 'Centro', full: false },
    { label: 'Cidade', key: 'cidade', type: 'text', placeholder: 'São Paulo', full: false },
    { label: 'CEP', key: 'cep', type: 'text', placeholder: '00000-000', full: false },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Início
          </Link>
          <span className="font-bold text-gradient">Meu Perfil</span>
          <button onClick={handleSignOut} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-4 pt-24 pb-12">
        {/* Avatar */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 border-2 border-primary">
            {firebaseUser?.photoURL ? (
              <img src={firebaseUser.photoURL} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <User className="h-9 w-9 text-primary" />
            )}
          </div>
          <p className="font-bold text-lg">{form.nome || 'Usuário'}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-primary/20 px-3 py-0.5 text-xs font-semibold text-primary capitalize">
            {user?.role || 'client'}
          </span>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="mb-6 text-lg font-bold">Dados pessoais</h2>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map(({ label, key, type, placeholder, full }) => (
                <div key={key} className={full ? 'sm:col-span-2' : ''}>
                  <label className="mb-1.5 block text-sm font-medium">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </div>

        <div className="mt-4 glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Histórico de pedidos</p>
              <p className="text-sm text-muted-foreground">Ver todos os seus pedidos</p>
            </div>
            <Link to="/meus-pedidos" className="rounded-xl bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition">
              Ver →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}