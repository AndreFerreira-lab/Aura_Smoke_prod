// Types compartilhados baseados no modelo de dados do Firestore (Seção 2 do ESCOPO.md)
// Constantes úteis
export const ORDER_STATUS_LABELS = {
    pendente: 'Pendente',
    confirmado: 'Confirmado',
    preparando: 'Preparando',
    saiu_entrega: 'Saiu para Entrega',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
};
export const ORDER_STATUS_COLORS = {
    pendente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    confirmado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    preparando: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    saiu_entrega: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    entregue: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelado: 'bg-red-500/20 text-red-400 border-red-500/30',
};
export const PAYMENT_METHOD_LABELS = {
    pix: 'PIX',
    dinheiro: 'Dinheiro na Entrega',
    cartao: 'Cartão',
};
export const WHATSAPP_STATE_LABELS = {
    menu: 'Menu Principal',
    catalogo: 'Catálogo',
    carrinho: 'Carrinho',
    endereco: 'Endereço',
    pagamento: 'Pagamento',
    confirmacao: 'Confirmação',
    aguardando_humano: 'Aguardando Atendente',
};
export const INVENTORY_MOVEMENT_LABELS = {
    entrada: 'Entrada',
    saida: 'Saída',
    ajuste: 'Ajuste',
    venda: 'Venda',
    devolucao: 'Devolução',
};
export const FINANCIAL_CATEGORY_LABELS = {
    venda_produto: 'Venda de Produto',
    entrega: 'Entrega',
    fornecedor: 'Fornecedor',
    marketing: 'Marketing',
    outros: 'Outros',
};
