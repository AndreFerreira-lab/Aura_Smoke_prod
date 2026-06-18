import { useEffect, useState } from 'react'
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@bola/firebase-config/client'
import { Plus, Search, Edit2, Trash2, Check, X, Package } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@bola/shared-types'

const CATEGORIES = ['Pods', 'Descartáveis', 'Líquidos', 'Acessórios', 'Baterias']

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  // Form fields
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [imagem, setImagem] = useState('')
  const [preco, setPreco] = useState(0)
  const [qtd, setQtd] = useState(0)
  const [categoria, setCategoria] = useState(CATEGORIES[0])
  const [ativo, setAtivo] = useState(true)

  async function fetchProducts() {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'products'))
      const list: Product[] = []
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Product))
      setProducts(list)
    } catch (e) {
      console.error(e)
      setProducts(DEMO_PRODUCTS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  function openNewModal() {
    setSelectedProduct(null)
    setNome('')
    setDescricao('')
    setImagem('')
    setPreco(0)
    setQtd(0)
    setCategoria(CATEGORIES[0])
    setAtivo(true)
    setModalOpen(true)
  }

  function openEditModal(product: Product) {
    setSelectedProduct(product)
    setNome(product.nome)
    setDescricao(product.descricao || '')
    setImagem(product.imagem || '')
    setPreco(product.preco)
    setQtd(product.qtd)
    setCategoria(product.categoria)
    setAtivo(product.ativo)
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!nome || preco <= 0 || qtd < 0) {
      toast.error('Preencha os campos obrigatórios corretamente.')
      return
    }

    const data = {
      nome,
      descricao,
      imagem,
      preco: Number(preco),
      qtd: Number(qtd),
      categoria,
      ativo,
      updatedAt: new Date().toISOString(),
    }

    try {
      if (selectedProduct?.id) {
        await updateDoc(doc(db, 'products', selectedProduct.id), data)
        toast.success('Produto atualizado com sucesso!')
      } else {
        await addDoc(collection(db, 'products'), {
          ...data,
          createdAt: new Date().toISOString(),
        })
        toast.success('Produto criado com sucesso!')
      }
      setModalOpen(false)
      fetchProducts()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar produto.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir este produto?')) return
    try {
      await deleteDoc(doc(db, 'products', id))
      toast.success('Produto excluído!')
      fetchProducts()
    } catch {
      toast.error('Erro ao excluir produto.')
    }
  }

  const filtered = products.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.descricao || '').toLowerCase().includes(search.toLowerCase()) ||
    p.categoria.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie o catálogo da loja</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition"
        >
          <Plus className="h-4 w-4" /> Novo Produto
        </button>
      </div>

      {/* Filter and search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar produto por nome, descrição ou categoria..."
          className="w-full rounded-xl bg-secondary/60 border border-border pl-10 pr-4 py-2.5 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Estoque</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 rounded bg-secondary animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              ) : (
                filtered.map(product => (
                  <tr key={product.id} className="hover:bg-secondary/10 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                          {product.imagem ? (
                            <img src={product.imagem} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{product.nome}</p>
                          <p className="text-xs text-muted-foreground max-w-[250px] truncate">{product.descricao}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.categoria}</td>
                    <td className="px-4 py-3 font-semibold text-primary">R$ {product.preco.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-sm ${product.qtd <= 5 ? 'text-orange-400 font-bold' : ''}`}>
                        {product.qtd}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {product.ativo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                          <Check className="h-3 w-3" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                          <X className="h-3 w-3" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="rounded-lg p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => product.id && handleDelete(product.id)}
                          className="rounded-lg p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="glass-strong z-10 w-full max-w-lg rounded-2xl p-6 shadow-2xl slide-up">
            <h2 className="text-xl font-bold mb-4">{selectedProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome do Produto</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Pod Xros 3 Nano"
                  required
                  className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Descrição (opcional)</label>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  rows={2}
                  className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={preco}
                    onChange={e => setPreco(Number(e.target.value))}
                    required
                    className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Estoque (Unidades)</label>
                  <input
                    type="number"
                    value={qtd}
                    onChange={e => setQtd(Number(e.target.value))}
                    required
                    className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Categoria</label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-2 text-sm outline-none focus:border-primary transition cursor-pointer"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">URL da Imagem (opcional)</label>
                  <input
                    type="text"
                    value={imagem}
                    onChange={e => setImagem(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={ativo}
                  onChange={e => setAtivo(e.target.checked)}
                  className="rounded border-border bg-secondary text-primary focus:ring-primary"
                />
                <label htmlFor="ativo" className="text-sm font-medium cursor-pointer">
                  Disponível para venda (Ativo)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const DEMO_PRODUCTS: Product[] = [
  { id: '1', nome: 'Pod Vaporesso Xros 3', descricao: 'Sistema pod avançado com coil intercambiável.', imagem: '', preco: 189.90, qtd: 15, categoria: 'Pods', ativo: true, createdAt: '', updatedAt: '' },
  { id: '2', nome: 'Descartável Elf Bar 600', descricao: '600 puffs, sabor menta gelada.', imagem: '', preco: 59.90, qtd: 42, categoria: 'Descartáveis', ativo: true, createdAt: '', updatedAt: '' },
  { id: '3', nome: 'Líquido Mango Ice 30ml', descricao: 'Freebase manga com gelo refrescante.', imagem: '', preco: 39.90, qtd: 0, categoria: 'Líquidos', ativo: false, createdAt: '', updatedAt: '' },
]
