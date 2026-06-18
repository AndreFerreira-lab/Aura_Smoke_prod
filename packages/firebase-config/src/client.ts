/// <reference types="vite/client" />
// Firebase Client SDK - Para apps React (client + admin)
import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { 
  getAuth, Auth, connectAuthEmulator, setPersistence, browserLocalPersistence
} from 'firebase/auth'
import { 
  Firestore, connectFirestoreEmulator, initializeFirestore, getFirestore,
  persistentLocalCache, persistentMultipleTabManager,
  collection, CollectionReference, doc, DocumentReference,
  query, where, orderBy, Timestamp
} from 'firebase/firestore'
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions'
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics'

// ─── Tipos locais (espelhando shared-types) ─────────────────────────────────
export type UserRole = 'client' | 'admin' | 'gerente' | 'atendente' | 'estoque'
export type OrderStatus = 'pendente' | 'confirmado' | 'preparando' | 'saiu_entrega' | 'entregue' | 'cancelado'
export type OrderOrigin = 'site' | 'whatsapp' | 'balcao' | 'admin'
export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao'
export type InventoryMovementType = 'entrada' | 'saida' | 'ajuste' | 'venda' | 'devolucao'
export type FinancialType = 'receita' | 'despesa'
export type FinancialCategory = 'venda_produto' | 'entrega' | 'fornecedor' | 'marketing' | 'outros'
export type FinancialStatus = 'previsto' | 'realizado' | 'cancelado'
export type WhatsAppState = 'menu' | 'catalogo' | 'carrinho' | 'endereco' | 'pagamento' | 'confirmacao' | 'aguardando_humano'

export interface UserProfile {
  nome: string; telefone: string; endereco: string; numero: string; cep: string;
  complemento?: string; bairro?: string; cidade?: string; estado?: string;
  pagamentoPreferido: PaymentMethod; dataNascimento?: string; cpf?: string;
}
export interface UserConfig { notificacoes: { whatsapp: boolean; email: boolean; push: boolean } }
export interface User { uid: string; email: string; role: UserRole; profile: UserProfile; config: UserConfig; createdAt: string; updatedAt: string; blocked?: boolean; tags?: string[]; ltv?: number; ticketMedio?: number }
export interface Product { id: string; nome: string; descricao: string; imagem: string; preco: number; qtd: number; categoria: string; ativo: boolean; createdAt: string; updatedAt: string; estoqueBaixo?: boolean; qtdReservada?: number }
export interface CartItem { productId: string; nome: string; preco: number; qtd: number; imagem: string; subtotal: number }
export interface OrderItem { productId: string; nome: string; preco: number; qtd: number; subtotal: number }
export interface PixInfo { txid: string; qrCode: string; qrCodeBase64?: string; expiresAt: string; status: 'pending' | 'paid' | 'expired'; merchantName?: string; merchantCity?: string }
export interface Order { id: string; clienteUid: string; clienteNome: string; clienteTelefone: string; clienteEndereco: string; itens: OrderItem[]; total: number; subtotal: number; taxaEntrega: number; desconto: number; formaPagamento: PaymentMethod; status: OrderStatus; origem: OrderOrigin; pix?: PixInfo; dataIso: string; dataEntrega?: string; userId?: string; observacoes?: string }
export interface InventoryMovement { id: string; productId: string; tipo: InventoryMovementType; qtd: number; qtdAnterior: number; qtdNova: number; motivo: string; userId: string; dataIso: string; orderId?: string }
export interface FinancialEntry { id: string; tipo: FinancialType; categoria: FinancialCategory; valor: number; descricao: string; formaPagamento?: PaymentMethod; status: FinancialStatus; orderId?: string; fornecedorId?: string; dataIso: string; userId: string }
export interface Supplier { id: string; nome: string; cnpj?: string; contato?: string; telefone?: string; email?: string; endereco?: string; produtosFornecidos: string[]; observacoes?: string; createdAt: string; updatedAt: string }
export interface WhatsAppSession { phoneNumber: string; state: WhatsAppState; carrinho: CartItem[]; enderecoTemp?: string; ordemTempId?: string; ultimaInteracao: string; clienteUid?: string; categoriaSelecionada?: string; paginaCatalogo?: number }
export interface Settings { taxaEntrega: number; valorMinimoEntrega: number; horarioFuncionamento: { abre: string; fecha: string; diasSemana: number[] }; pixConfig: { chave: string; merchantName: string; merchantCity: string }; whatsappConfig: { numero: string; token?: string; webhookUrl?: string }; notificacoes: { novoPedido: boolean; statusMudanca: boolean; estoqueBaixo: boolean } }

// ─── Firebase Config ────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const isConfigValid = Object.values(firebaseConfig).every(v => v && v !== 'undefined')
if (!isConfigValid) {
  console.warn('[Firebase] Config incompleta - verifique variáveis de ambiente', firebaseConfig)
}

let app: FirebaseApp
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

export const auth: Auth = getAuth(app)
setPersistence(auth, browserLocalPersistence).catch(console.error)

let dbInstance: Firestore
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
} catch {
  // Already initialized (HMR) or persistent cache not supported
  dbInstance = getFirestore(app)
}
export const db: Firestore = dbInstance

export const storage: FirebaseStorage = getStorage(app)
export const functions: Functions = getFunctions(app, 'southamerica-east1')

let analytics: Analytics | null = null
if (typeof window !== 'undefined') {
  isSupported().then(supported => { if (supported) analytics = getAnalytics(app) })
}
export { analytics }

export function useEmulators() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
    const host = 'localhost'
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, host, 8080)
    connectStorageEmulator(storage, host, 9199)
    connectFunctionsEmulator(functions, host, 5001)
    console.log('[Firebase] Emuladores conectados')
  }
}

// ─── Coleções tipadas ───────────────────────────────────────────────────────
export const usersCol = collection(db, 'users') as CollectionReference<User>
export const productsCol = collection(db, 'products') as CollectionReference<Product>
export const ordersCol = collection(db, 'orders') as CollectionReference<Order>
export const inventoryMovementsCol = collection(db, 'inventory_movements') as CollectionReference<InventoryMovement>
export const financialCol = collection(db, 'financial') as CollectionReference<FinancialEntry>
export const suppliersCol = collection(db, 'suppliers') as CollectionReference<Supplier>
export const whatsappSessionsCol = collection(db, 'whatsapp_sessions') as CollectionReference<WhatsAppSession>
export const settingsDoc = doc(db, 'settings', 'general') as DocumentReference<Settings>

export const userDoc = (uid: string) => doc(usersCol, uid)
export const activeProductsQuery = query(productsCol, where('ativo', '==', true), orderBy('nome'))
export const userOrdersQuery = (uid: string) => query(ordersCol, where('clienteUid', '==', uid), orderBy('dataIso', 'desc'))
export const pendingOrdersQuery = query(ordersCol, where('status', '==', 'pendente'), orderBy('dataIso', 'asc'))
export const lowStockQuery = query(productsCol, where('ativo', '==', true), where('qtd', '<', 5))

export function toISO(timestamp: Timestamp | Date | string | number): string {
  if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString()
  if (timestamp instanceof Date) return timestamp.toISOString()
  if (typeof timestamp === 'string') return timestamp
  return new Date(timestamp).toISOString()
}

export function fromISO(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso))
}

export { app }
export default app