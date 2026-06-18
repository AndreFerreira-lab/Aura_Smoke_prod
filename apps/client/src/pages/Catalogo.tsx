import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@bola/firebase-config/client'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { ShoppingCart, Search, Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '@bola/shared-types'

const CATEGORIES = ['Todos', 'Pods', 'Descartáveis', 'Líquidos', 'Acessórios', 'Baterias']

export default function Catalogo() {
  const { addItem, itemCount } = useCart()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 9

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(
          collection(db, 'products'),
          where('ativo', '==', true),
          orderBy('nome')
        )
        const snap = await getDocs(q)
        const items: Product[] = []
        snap.forEach(d => items.push({ id: d.id, ...d.data() } as Product))
        setProducts(items)
      } catch (err) {
        console.error('Erro ao carregar produtos:', err)
        // Show demo products if Firebase not configured
        setProducts(DEMO_PRODUCTS)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const filtered = products.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.descricao || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'Todos' || p.categoria === category
    return matchSearch && matchCat
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleAdd(product: Product) {
    addItem(product)
    toast.success(`${product.nome} adicionado ao carrinho!`, { duration: 1500 })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/bolaaia.png" alt="Bola AI" className="h-8 w-8 rounded-full" />
            <span className="text-lg font-bold text-gradient">Bola AI Express</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Início
            </Link>
            {user ? (
              <>
                <Link to="/meus-pedidos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Meus Pedidos
                </Link>
                <Link to="/perfil" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Perfil
                </Link>
              </>
            ) : (
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Entrar
              </Link>
            )}
            <Link to="/carrinho" className="relative rounded-full bg-primary p-2.5 text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-xs font-bold">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 pt-24 pb-12">
        <h1 className="text-4xl font-bold text-gradient mb-2">Catálogo</h1>
        <p className="text-muted-foreground mb-8">Pods e cigarros eletrônicos selecionados</p>

        {/* Search + Categories */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Buscar produto..."
              className="w-full rounded-xl bg-secondary/50 border border-border pl-11 pr-4 py-3 text-sm placeholder-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setPage(0) }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${category === cat ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                <div className="mb-4 h-48 rounded-xl bg-secondary" />
                <div className="mb-2 h-5 w-3/4 rounded bg-secondary" />
                <div className="h-4 w-1/2 rounded bg-secondary" />
              </div>
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Nenhum produto encontrado</h3>
            <p className="mt-2 text-muted-foreground">Tente mudar a busca ou categoria.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paged.map(product => (
                <div key={product.id} className="glass rounded-2xl overflow-hidden group transition hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
                  <div className="relative h-48 overflow-hidden bg-secondary">
                    {product.imagem ? (
                      <img src={product.imagem} alt={product.nome} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    {product.qtd < 5 && product.qtd > 0 && (
                      <span className="absolute top-2 right-2 rounded-full bg-orange-500/90 px-2 py-0.5 text-xs font-bold">
                        Últimas unidades!
                      </span>
                    )}
                    {product.qtd === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                        <span className="rounded-full bg-destructive px-3 py-1 text-sm font-bold">Esgotado</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{product.nome}</h3>
                    {product.descricao && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.descricao}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-primary">
                          R$ {product.preco.toFixed(2)}
                        </span>
                        <span className="ml-2 text-xs text-green-400">+5% off PIX</span>
                      </div>
                      <button
                        onClick={() => handleAdd(product)}
                        disabled={product.qtd === 0}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        + Carrinho
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="rounded-xl border border-border p-2 disabled:opacity-30 hover:bg-secondary transition">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-xl border border-border p-2 disabled:opacity-30 hover:bg-secondary transition">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Demo products shown when Firebase is not configured
const DEMO_PRODUCTS: Product[] = [
  { id: '1', nome: 'Pod Vaporesso Xros 3', descricao: 'Sistema pod avançado com coil intercambiável.', imagem: '', preco: 189.90, qtd: 15, categoria: 'Pods', ativo: true, createdAt: '', updatedAt: '' },
  { id: '2', nome: 'Descartável Elf Bar 600', descricao: '600 puffs, sabor menta gelada.', imagem: '', preco: 59.90, qtd: 42, categoria: 'Descartáveis', ativo: true, createdAt: '', updatedAt: '' },
  { id: '3', nome: 'Líquido Mango Ice 30ml', descricao: 'Freebase manga com gelo refrescante.', imagem: '', preco: 39.90, qtd: 28, categoria: 'Líquidos', ativo: true, createdAt: '', updatedAt: '' },
  { id: '4', nome: 'Pod SMOK Nord 5', descricao: 'Potência ajustável até 80W.', imagem: '', preco: 229.90, qtd: 8, categoria: 'Pods', ativo: true, createdAt: '', updatedAt: '' },
  { id: '5', nome: 'Descartável Geek Bar 5000', descricao: '5000 puffs, sabor morango com creme.', imagem: '', preco: 89.90, qtd: 3, categoria: 'Descartáveis', ativo: true, createdAt: '', updatedAt: '' },
  { id: '6', nome: 'Bateria 18650 3000mAh', descricao: 'Bateria de longa duração para mods.', imagem: '', preco: 29.90, qtd: 50, categoria: 'Baterias', ativo: true, createdAt: '', updatedAt: '' },
]