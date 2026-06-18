import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, UserPlus, Chrome } from 'lucide-react'
import { toast } from 'sonner'
import type { UserProfile } from '@bola/shared-types'

export default function Cadastro() {
  const navigate = useNavigate()
  const { signUp, signInWithGoogle } = useAuth()
  const [step, setStep] = useState(1)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    password: '',
    confirmPassword: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (form.password.length < 6) {
      toast.error('Senha deve ter ao menos 6 caracteres.')
      return
    }
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const profile: UserProfile = {
        nome: form.nome,
        telefone: form.telefone,
        endereco: '',
        numero: '',
        cep: '',
        pagamentoPreferido: 'pix',
      }
      await signUp(form.email, form.password, profile)
      toast.success('Conta criada com sucesso! Bem-vindo(a)!')
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { code?: string })?.code
      if (msg === 'auth/email-already-in-use') {
        toast.error('Email já cadastrado. Tente fazer login.')
      } else {
        toast.error('Erro ao criar conta. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      toast.success('Conta criada com sucesso!')
      navigate('/')
    } catch {
      toast.error('Erro ao entrar com Google.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md slide-up">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <img src="/bolaaia.png" alt="Bola AI" className="h-16 w-16 rounded-2xl shadow-lg" />
            <span className="text-2xl font-bold text-gradient">Bola AI Express</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Crie sua conta gratuita</p>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2].map(s => (
            <div key={s} className={`flex items-center ${s < 2 ? 'flex-1' : ''}`}>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {s}
              </div>
              {s < 2 && <div className={`flex-1 h-0.5 mx-2 transition-all ${step > s ? 'bg-primary' : 'bg-secondary'}`} />}
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-8">
          {step === 1 && (
            <>
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary/50 py-3 text-sm font-medium transition hover:bg-secondary disabled:opacity-50"
              >
                <Chrome className="h-4 w-4" />
                {googleLoading ? 'Cadastrando...' : 'Cadastrar com Google'}
              </button>
              <div className="relative mb-6 flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="mx-4 text-xs text-muted-foreground">ou</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Nome completo</label>
                  <input type="text" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome" required className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" required className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Senha</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mín. 6 caracteres" required className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 pr-12 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Confirmar senha</label>
                  <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Repita a senha" required className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
                </div>
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90">
                  Próximo →
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="mb-4 text-lg font-semibold">Dados de contato</h2>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Telefone / WhatsApp</label>
                <input type="tel" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(11) 99999-9999" required className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-xl border border-border py-3 text-sm font-medium transition hover:bg-secondary">
                  ← Voltar
                </button>
                <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:opacity-50">
                  <UserPlus className="h-4 w-4" />
                  {loading ? 'Criando...' : 'Criar conta'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}