// Types compartilhados baseados no modelo de dados do Firestore (Seção 2 do ESCOPO.md)

export type UserRole = 'client' | 'admin' | 'gerente' | 'atendente' | 'estoque'

export interface UserProfile {
  nome: string
  telefone: string
  endereco: string
  numero: string
  cep: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  pagamentoPreferido: 'pix' | 'dinheiro' | 'cartao'
  dataNascimento?: string
  cpf?: string
}

export interface UserConfig {
  notificacoes: {
    whatsapp: boolean
    email: boolean
    push: boolean
  }
}

export interface User {
  uid: string
  email: string
  role: UserRole
  profile: UserProfile
  config: UserConfig
  createdAt: string // ISO
  updatedAt: string // ISO
  blocked?: boolean
  tags?: string[] // VIP, Atacado, Problema, etc.
  ltv?: number // Lifetime value
  ticketMedio?: number
}

export interface Product {
  id: string
  nome: string
  descricao: string
  imagem: string
  preco: number
  qtd: number
  categoria: string
  ativo: boolean
  createdAt: string
  updatedAt: string
  // Campos calculados
  estoqueBaixo?: boolean
  qtdReservada?: number
}

export interface CartItem {
  productId: string
  nome: string
  preco: number
  qtd: number
  imagem: string
  subtotal: number
}

export type OrderStatus = 
  | 'pendente'
  | 'confirmado'
  | 'preparando'
  | 'saiu_entrega'
  | 'entregue'
  | 'cancelado'

export type OrderOrigin = 'site' | 'whatsapp' | 'balcao' | 'admin'

export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao'

export interface OrderItem {
  productId: string
  nome: string
  preco: number
  qtd: number
  subtotal: number
}

export interface PixInfo {
  txid: string
  qrCode: string
  qrCodeBase64?: string
  expiresAt: string
  status: 'pending' | 'paid' | 'expired'
  merchantName?: string
  merchantCity?: string
}

export interface Order {
  id: string
  clienteUid: string
  clienteNome: string
  clienteTelefone: string
  clienteEndereco: string
  itens: OrderItem[]
  total: number
  subtotal: number
  taxaEntrega: number
  desconto: number
  formaPagamento: PaymentMethod
  status: OrderStatus
  origem: OrderOrigin
  pix?: PixInfo
  dataIso: string
  dataEntrega?: string
  userId?: string // atendente que atendeu
  observacoes?: string
  // Campos calculados
  tempoPreparo?: number // minutos
  podeCancelar?: boolean
}

export type InventoryMovementType = 'entrada' | 'saida' | 'ajuste' | 'venda' | 'devolucao'

export interface InventoryMovement {
  id: string
  productId: string
  tipo: InventoryMovementType
  qtd: number
  qtdAnterior: number
  qtdNova: number
  motivo: string
  userId: string
  dataIso: string
  orderId?: string // se venda/devolucao
}

export type FinancialType = 'receita' | 'despesa'
export type FinancialCategory = 
  | 'venda_produto' 
  | 'entrega' 
  | 'fornecedor' 
  | 'marketing' 
  | 'outros'
export type FinancialStatus = 'previsto' | 'realizado' | 'cancelado'

export interface FinancialEntry {
  id: string
  tipo: FinancialType
  categoria: FinancialCategory
  valor: number
  descricao: string
  formaPagamento?: PaymentMethod
  status: FinancialStatus
  orderId?: string
  fornecedorId?: string
  dataIso: string
  userId: string
}

export interface Supplier {
  id: string
  nome: string
  cnpj?: string
  contato?: string
  telefone?: string
  email?: string
  endereco?: string
  produtosFornecidos: string[] // productIds
  observacoes?: string
  createdAt: string
  updatedAt: string
}

export type WhatsAppState = 
  | 'menu'
  | 'catalogo'
  | 'carrinho'
  | 'endereco'
  | 'pagamento'
  | 'confirmacao'
  | 'aguardando_humano'

export interface WhatsAppSession {
  phoneNumber: string
  state: WhatsAppState
  carrinho: CartItem[]
  enderecoTemp?: string
  ordemTempId?: string
  ultimaInteracao: string
  clienteUid?: string
  // Dados temporários do fluxo
  categoriaSelecionada?: string
  paginaCatalogo?: number
}

export interface Settings {
  taxaEntrega: number
  valorMinimoEntrega: number
  horarioFuncionamento: {
    abre: string // HH:mm
    fecha: string // HH:mm
    diasSemana: number[] // 0-6
  }
  pixConfig: {
    chave: string
    merchantName: string
    merchantCity: string
  }
  whatsappConfig: {
    numero: string
    token?: string
    webhookUrl?: string
  }
  notificacoes: {
    novoPedido: boolean
    statusMudanca: boolean
    estoqueBaixo: boolean
  }
}

// Tipos para APIs/Responses
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Tipos para Dashboard/Admin
export interface DashboardStats {
  vendasHoje: number
  pedidosPendentes: number
  ticketMedio: number
  estoqueCritico: number
  vendas7Dias: { data: string; valor: number }[]
  vendas30Dias: { data: string; valor: number }[]
  topProdutos: { productId: string; nome: string; qtd: number; receita: number }[]
  pedidosRecentes: Order[]
}

export interface FinancialSummary {
  receitas: number
  despesas: number
  lucro: number
  periodo: { inicio: string; fim: string }
  porCategoria: { categoria: string; valor: number }[]
  porFormaPagamento: { forma: string; valor: number }[]
  fluxoCaixa: { data: string; previsto: number; realizado: number }[]
}

// Constantes úteis
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  saiu_entrega: 'Saiu para Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pendente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  preparando: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  saiu_entrega: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  entregue: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelado: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro na Entrega',
  cartao: 'Cartão',
}

export const WHATSAPP_STATE_LABELS: Record<WhatsAppState, string> = {
  menu: 'Menu Principal',
  catalogo: 'Catálogo',
  carrinho: 'Carrinho',
  endereco: 'Endereço',
  pagamento: 'Pagamento',
  confirmacao: 'Confirmação',
  aguardando_humano: 'Aguardando Atendente',
}

export const INVENTORY_MOVEMENT_LABELS: Record<InventoryMovementType, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
  venda: 'Venda',
  devolucao: 'Devolução',
}

export const FINANCIAL_CATEGORY_LABELS: Record<FinancialCategory, string> = {
  venda_produto: 'Venda de Produto',
  entrega: 'Entrega',
  fornecedor: 'Fornecedor',
  marketing: 'Marketing',
  outros: 'Outros',
}