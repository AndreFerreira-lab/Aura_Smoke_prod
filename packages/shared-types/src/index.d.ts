export type UserRole = 'client' | 'admin' | 'gerente' | 'atendente' | 'estoque';
export interface UserProfile {
    nome: string;
    telefone: string;
    endereco: string;
    numero: string;
    cep: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    pagamentoPreferido: 'pix' | 'dinheiro' | 'cartao';
    dataNascimento?: string;
    cpf?: string;
}
export interface UserConfig {
    notificacoes: {
        whatsapp: boolean;
        email: boolean;
        push: boolean;
    };
}
export interface User {
    uid: string;
    email: string;
    role: UserRole;
    profile: UserProfile;
    config: UserConfig;
    createdAt: string;
    updatedAt: string;
    blocked?: boolean;
    tags?: string[];
    ltv?: number;
    ticketMedio?: number;
}
export interface Product {
    id: string;
    nome: string;
    descricao: string;
    imagem: string;
    preco: number;
    qtd: number;
    categoria: string;
    ativo: boolean;
    createdAt: string;
    updatedAt: string;
    estoqueBaixo?: boolean;
    qtdReservada?: number;
}
export interface CartItem {
    productId: string;
    nome: string;
    preco: number;
    qtd: number;
    imagem: string;
    subtotal: number;
}
export type OrderStatus = 'pendente' | 'confirmado' | 'preparando' | 'saiu_entrega' | 'entregue' | 'cancelado';
export type OrderOrigin = 'site' | 'whatsapp' | 'balcao' | 'admin';
export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao';
export interface OrderItem {
    productId: string;
    nome: string;
    preco: number;
    qtd: number;
    subtotal: number;
}
export interface PixInfo {
    txid: string;
    qrCode: string;
    qrCodeBase64?: string;
    expiresAt: string;
    status: 'pending' | 'paid' | 'expired';
    merchantName?: string;
    merchantCity?: string;
}
export interface Order {
    id: string;
    clienteUid: string;
    clienteNome: string;
    clienteTelefone: string;
    clienteEndereco: string;
    itens: OrderItem[];
    total: number;
    subtotal: number;
    taxaEntrega: number;
    desconto: number;
    formaPagamento: PaymentMethod;
    status: OrderStatus;
    origem: OrderOrigin;
    pix?: PixInfo;
    dataIso: string;
    dataEntrega?: string;
    userId?: string;
    observacoes?: string;
    tempoPreparo?: number;
    podeCancelar?: boolean;
}
export type InventoryMovementType = 'entrada' | 'saida' | 'ajuste' | 'venda' | 'devolucao';
export interface InventoryMovement {
    id: string;
    productId: string;
    tipo: InventoryMovementType;
    qtd: number;
    qtdAnterior: number;
    qtdNova: number;
    motivo: string;
    userId: string;
    dataIso: string;
    orderId?: string;
}
export type FinancialType = 'receita' | 'despesa';
export type FinancialCategory = 'venda_produto' | 'entrega' | 'fornecedor' | 'marketing' | 'outros';
export type FinancialStatus = 'previsto' | 'realizado' | 'cancelado';
export interface FinancialEntry {
    id: string;
    tipo: FinancialType;
    categoria: FinancialCategory;
    valor: number;
    descricao: string;
    formaPagamento?: PaymentMethod;
    status: FinancialStatus;
    orderId?: string;
    fornecedorId?: string;
    dataIso: string;
    userId: string;
}
export interface Supplier {
    id: string;
    nome: string;
    cnpj?: string;
    contato?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    produtosFornecidos: string[];
    observacoes?: string;
    createdAt: string;
    updatedAt: string;
}
export type WhatsAppState = 'menu' | 'catalogo' | 'carrinho' | 'endereco' | 'pagamento' | 'confirmacao' | 'aguardando_humano';
export interface WhatsAppSession {
    phoneNumber: string;
    state: WhatsAppState;
    carrinho: CartItem[];
    enderecoTemp?: string;
    ordemTempId?: string;
    ultimaInteracao: string;
    clienteUid?: string;
    categoriaSelecionada?: string;
    paginaCatalogo?: number;
}
export interface Settings {
    taxaEntrega: number;
    valorMinimoEntrega: number;
    horarioFuncionamento: {
        abre: string;
        fecha: string;
        diasSemana: number[];
    };
    pixConfig: {
        chave: string;
        merchantName: string;
        merchantCity: string;
    };
    whatsappConfig: {
        numero: string;
        token?: string;
        webhookUrl?: string;
    };
    notificacoes: {
        novoPedido: boolean;
        statusMudanca: boolean;
        estoqueBaixo: boolean;
    };
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
export interface DashboardStats {
    vendasHoje: number;
    pedidosPendentes: number;
    ticketMedio: number;
    estoqueCritico: number;
    vendas7Dias: {
        data: string;
        valor: number;
    }[];
    vendas30Dias: {
        data: string;
        valor: number;
    }[];
    topProdutos: {
        productId: string;
        nome: string;
        qtd: number;
        receita: number;
    }[];
    pedidosRecentes: Order[];
}
export interface FinancialSummary {
    receitas: number;
    despesas: number;
    lucro: number;
    periodo: {
        inicio: string;
        fim: string;
    };
    porCategoria: {
        categoria: string;
        valor: number;
    }[];
    porFormaPagamento: {
        forma: string;
        valor: number;
    }[];
    fluxoCaixa: {
        data: string;
        previsto: number;
        realizado: number;
    }[];
}
export declare const ORDER_STATUS_LABELS: Record<OrderStatus, string>;
export declare const ORDER_STATUS_COLORS: Record<OrderStatus, string>;
export declare const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string>;
export declare const WHATSAPP_STATE_LABELS: Record<WhatsAppState, string>;
export declare const INVENTORY_MOVEMENT_LABELS: Record<InventoryMovementType, string>;
export declare const FINANCIAL_CATEGORY_LABELS: Record<FinancialCategory, string>;
