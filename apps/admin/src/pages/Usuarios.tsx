import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@bola/firebase-config/client'
import { Search, Shield, User as UserIcon, ShieldAlert, Award } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@bola/shared-types'

const ROLES = ['client', 'atendente', 'estoque', 'gerente', 'admin']

export default function Usuarios() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  async function fetchUsers() {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'users'))
      const list: User[] = []
      snap.forEach(d => list.push({ uid: d.id, ...d.data() } as User))
      setUsers(list)
    } catch (e) {
      console.error(e)
      setUsers(DEMO_USERS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function handleRoleChange(uid: string, newRole: string) {
    setUpdating(uid)
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole })
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole as User['role'] } : u))
      toast.success('Regra do usuário atualizada!')
    } catch {
      toast.error('Erro ao atualizar permissão.')
    } finally {
      setUpdating(null)
    }
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.profile?.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.profile?.telefone || '').includes(search)
  )

  function getRoleIcon(role: string) {
    switch (role) {
      case 'admin': return <ShieldAlert className="h-4 w-4 text-red-400" />
      case 'gerente': return <Award className="h-4 w-4 text-orange-400" />
      case 'atendente': return <Shield className="h-4 w-4 text-blue-400" />
      case 'estoque': return <Shield className="h-4 w-4 text-purple-400" />
      default: return <UserIcon className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerencie permissões e visualize clientes</p>
      </div>

      {/* Filter and search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar usuário por nome, email ou telefone..."
          className="w-full rounded-xl bg-secondary/60 border border-border pl-10 pr-4 py-2.5 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nome / Contato</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Cargo / Permissão</th>
                <th className="px-4 py-3 font-medium text-right">Alterar Cargo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 rounded bg-secondary animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map(user => (
                  <tr key={user.uid} className="hover:bg-secondary/10 transition">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold">{user.profile?.nome || 'Sem Nome'}</p>
                        <p className="text-xs text-muted-foreground">{user.profile?.telefone || 'Sem telefone'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize">
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={user.role}
                        disabled={updating === user.uid}
                        onChange={e => handleRoleChange(user.uid, e.target.value)}
                        className="rounded-lg bg-secondary/80 border border-border px-2.5 py-1 text-xs outline-none focus:border-primary transition cursor-pointer disabled:opacity-50"
                      >
                        {ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const DEMO_USERS: User[] = [
  { uid: '1', email: 'admin@bolaai.com', role: 'admin', profile: { nome: 'Administrador Bola AI', telefone: '11999999999', pagamentoPreferido: 'pix', endereco: '', numero: '', cep: '' }, config: { notificacoes: { whatsapp: true, email: true, push: false } }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { uid: '2', email: 'gerente@bolaai.com', role: 'gerente', profile: { nome: 'Gerente Comercial', telefone: '11988888888', pagamentoPreferido: 'pix', endereco: '', numero: '', cep: '' }, config: { notificacoes: { whatsapp: true, email: true, push: false } }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { uid: '3', email: 'cliente1@gmail.com', role: 'client', profile: { nome: 'João da Silva', telefone: '11977777777', pagamentoPreferido: 'pix', endereco: 'Rua das Flores', numero: '123', cep: '01001-000' }, config: { notificacoes: { whatsapp: true, email: true, push: false } }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]
