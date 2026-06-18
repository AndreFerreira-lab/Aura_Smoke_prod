import makeWASocketImport, { 
  DisconnectReason, 
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  proto,
  WAMessage,
  WASocket,
  BaileysEventMap,
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeWASocket = (makeWASocketImport as any).default || makeWASocketImport
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import type { WhatsAppSession, WhatsAppState, CartItem, Product, Order, OrderItem } from '@bola/shared-types'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Firebase Admin init ────────────────────────────────────────────────────
if (getApps().length === 0) {
  initializeApp()
}
const db = getFirestore()
const logger = pino({ 
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
})

// ─── State Machine ───────────────────────────────────────────────────────────

type StateHandler = (sock: WASocket, msg: proto.IWebMessageInfo, session: WhatsAppSession) => Promise<void>

const stateHandlers: Partial<Record<WhatsAppState, StateHandler>> = {}

function registerHandler(state: WhatsAppState, handler: StateHandler) {
  stateHandlers[state] = handler
}

// ─── Session Management ─────────────────────────────────────────────────────

async function getOrCreateSession(phoneNumber: string): Promise<WhatsAppSession> {
  const docRef = db.collection('whatsapp_sessions').doc(phoneNumber)
  const docSnap = await docRef.get()

  if (docSnap.exists) {
    return { phoneNumber, ...docSnap.data() } as WhatsAppSession
  }

  const newSession: WhatsAppSession = {
    phoneNumber,
    state: 'menu',
    carrinho: [],
    ultimaInteracao: new Date().toISOString(),
  }

  await docRef.set(newSession)
  return newSession
}

async function updateSession(phoneNumber: string, updates: Partial<WhatsAppSession>): Promise<void> {
  const docRef = db.collection('whatsapp_sessions').doc(phoneNumber)
  await docRef.set({
    ...updates,
    ultimaInteracao: new Date().toISOString(),
  }, { merge: true })
}

async function resetSession(phoneNumber: string): Promise<void> {
  await updateSession(phoneNumber, {
    state: 'menu',
    carrinho: [],
    enderecoTemp: undefined,
    ordemTempId: undefined,
    categoriaSelecionada: undefined,
    paginaCatalogo: undefined,
  })
}

// ─── Message Helpers ────────────────────────────────────────────────────────

async function sendMessage(sock: WASocket, to: string, text: string) {
  await sock.sendMessage(to, { text })
}

// ─── Menu Principal ─────────────────────────────────────────────────────────

const MENU_PRINCIPAL = `👋 *Olá! Bem-vindo à Bola AI Express!*

Escolha uma opção:

1️⃣ *Ver Cardápio*
2️⃣ *Meus Pedidos*
3️⃣ *Falar com Atendente*
4️⃣ *Meu Endereço*

Digite o número da opção desejada.`

async function handleMenu(sock: WASocket, msg: proto.IWebMessageInfo, session: WhatsAppSession) {
  const text = extractText(msg)?.trim()
  const from = msg.key.remoteJid!

  switch (text) {
    case '1':
      await updateSession(session.phoneNumber, { state: 'catalogo', paginaCatalogo: 0 })
      await handleCatalogo(sock, msg, { ...session, state: 'catalogo', paginaCatalogo: 0 })
      break

    case '2':
      await handleListarPedidos(sock, session, msg)
      break

    case '3':
      await updateSession(session.phoneNumber, { state: 'aguardando_humano' })
      await sendMessage(sock, from, '🔄 *Transferindo para um atendente...*\n\nEm breve alguém irá te atender. Aguarde!')
      break

    case '4':
      await updateSession(session.phoneNumber, { state: 'endereco' })
      await sendMessage(sock, from, '📍 *Informe seu endereço completo:*\n\nExemplo: Rua Exemplo, 123 - Bairro - Cidade/CEP')
      break

    default:
      await sendMessage(sock, from, MENU_PRINCIPAL)
      break
  }
}
registerHandler('menu', handleMenu)

// ─── Catálogo ───────────────────────────────────────────────────────────────

async function handleCatalogo(sock: WASocket, msg: proto.IWebMessageInfo, session: WhatsAppSession) {
  const text = extractText(msg)?.trim()
  const from = msg.key.remoteJid!

  if (text?.toLowerCase() === 'voltar' || text === '0') {
    await resetSession(session.phoneNumber)
    await sendMessage(sock, from, MENU_PRINCIPAL)
    return
  }

  if (text?.toLowerCase() === 'carrinho') {
    await updateSession(session.phoneNumber, { state: 'carrinho' })
    await handleCarrinho(sock, msg, { ...session, state: 'carrinho' })
    return
  }

  const productsSnap = await db.collection('products')
    .where('ativo', '==', true)
    .where('qtd', '>', 0)
    .orderBy('qtd', 'desc')
    .orderBy('nome')
    .get()

  const products: (Product & { id: string })[] = []
  productsSnap.forEach((d: QueryDocumentSnapshot) => {
    products.push({ id: d.id, ...d.data() } as Product & { id: string })
  })

  if (products.length === 0) {
    await sendMessage(sock, from, '😔 *Nenhum produto disponível no momento.*\n\nDigite *voltar* para o menu principal.')
    return
  }

  const page = session.paginaCatalogo || 0
  const pageSize = 5
  const start = page * pageSize
  const pageProducts = products.slice(start, start + pageSize)
  const hasMore = start + pageSize < products.length

  let msg_text = `📋 *CARDÁPIO* (Página ${page + 1}/${Math.ceil(products.length / pageSize)})\n\n`

  pageProducts.forEach((p, i) => {
    const idx = start + i + 1
    msg_text += `${idx}. *${p.nome}*\n   💰 R$ ${p.preco.toFixed(2)} | 📦 ${p.qtd} em estoque\n\n`
  })

  msg_text += `\nDigite o número do produto para *adicionar ao carrinho*.`
  msg_text += `\nDigite *carrinho* para ver seu carrinho.`
  if (hasMore) msg_text += `\nDigite *mais* para ver mais produtos.`
  msg_text += `\nDigite *voltar* para o menu principal.`

  const choice = parseInt(text || '')
  if (!isNaN(choice) && choice >= 1 && choice <= products.length) {
    const product = products[choice - 1]
    const existingItem = session.carrinho.find(item => item.productId === product.id)

    if (existingItem) {
      existingItem.qtd += 1
      existingItem.subtotal = existingItem.qtd * existingItem.preco
    } else {
      session.carrinho.push({
        productId: product.id,
        nome: product.nome,
        preco: product.preco,
        qtd: 1,
        imagem: product.imagem || '',
        subtotal: product.preco,
      })
    }

    await updateSession(session.phoneNumber, { carrinho: session.carrinho })
    await sendMessage(sock, from, `✅ *${product.nome}* adicionado ao carrinho!\n\n🛒 Itens no carrinho: ${session.carrinho.length}\n💰 Subtotal: R$ ${session.carrinho.reduce((sum, it) => sum + it.subtotal, 0).toFixed(2)}`)
    return
  }

  if (text?.toLowerCase() === 'mais' && hasMore) {
    await updateSession(session.phoneNumber, { paginaCatalogo: page + 1 })
    await handleCatalogo(sock, msg, { ...session, paginaCatalogo: page + 1 })
    return
  }

  await sendMessage(sock, from, msg_text)
}
registerHandler('catalogo', handleCatalogo)

// ─── Carrinho ───────────────────────────────────────────────────────────────

async function handleCarrinho(sock: WASocket, msg: proto.IWebMessageInfo, session: WhatsAppSession) {
  const text = extractText(msg)?.trim()
  const from = msg.key.remoteJid!

  if (text?.toLowerCase() === 'voltar') {
    await updateSession(session.phoneNumber, { state: 'catalogo', paginaCatalogo: 0 })
    await handleCatalogo(sock, msg, { ...session, state: 'catalogo', paginaCatalogo: 0 })
    return
  }

  if (text?.toLowerCase() === 'finalizar' || text?.toLowerCase() === 'finalizar pedido') {
    if (session.carrinho.length === 0) {
      await sendMessage(sock, from, '🛒 *Seu carrinho está vazio!*\n\nDigite *voltar* para ver o cardápio.')
      return
    }
    await updateSession(session.phoneNumber, { state: 'endereco' })
    await sendMessage(sock, from, '📍 *Informe seu endereço de entrega:*\n\nExemplo: Rua Exemplo, 123 - Bairro - Cidade/CEP\n\nDigite *voltar* para voltar ao carrinho.')
    return
  }

  if (text?.toLowerCase() === 'limpar') {
    await updateSession(session.phoneNumber, { carrinho: [] })
    await sendMessage(sock, from, '🗑️ *Carrinho limpo!*\n\nDigite *voltar* para ver o cardápio.')
    return
  }

  if (session.carrinho.length === 0) {
    await sendMessage(sock, from, '🛒 *Seu carrinho está vazio!*\n\nDigite *voltar* para ver o cardápio.')
    return
  }

  let msg_text = `🛒 *SEU CARRINHO*\n\n`
  let total = 0

  session.carrinho.forEach((item, i) => {
    msg_text += `${i + 1}. *${item.nome}*\n   ${item.qtd}x R$ ${item.preco.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}\n\n`
    total += item.subtotal
  })

  msg_text += `━━━━━━━━━━━━━━━━━━\n💰 *TOTAL: R$ ${total.toFixed(2)}*\n\n`
  msg_text += `Digite *finalizar* para prosseguir.\n`
  msg_text += `Digite *limpar* para esvaziar o carrinho.\n`
  msg_text += `Digite *voltar* para continuar comprando.`

  await sendMessage(sock, from, msg_text)
}
registerHandler('carrinho', handleCarrinho)

// ─── Endereço ───────────────────────────────────────────────────────────────

async function handleEndereco(sock: WASocket, msg: proto.IWebMessageInfo, session: WhatsAppSession) {
  const text = extractText(msg)?.trim()
  const from = msg.key.remoteJid!

  if (text?.toLowerCase() === 'voltar') {
    await updateSession(session.phoneNumber, { state: 'carrinho' })
    await handleCarrinho(sock, msg, { ...session, state: 'carrinho' })
    return
  }

  if (!text || text.length < 10) {
    await sendMessage(sock, from, '⚠️ *Endereço muito curto.*\n\nPor favor, informe o endereço completo:\nExemplo: Rua Exemplo, 123 - Bairro - Cidade/CEP')
    return
  }

  await updateSession(session.phoneNumber, { 
    enderecoTemp: text, 
    state: 'pagamento' 
  })

  const total = session.carrinho.reduce((sum, it) => sum + it.subtotal, 0)

  await sendMessage(sock, from, 
    `📍 *Endereço confirmado:* ${text}\n\n` +
    `💰 Total do pedido: *R$ ${total.toFixed(2)}*\n\n` +
    `Escolha a forma de pagamento:\n\n` +
    `1️⃣ *PIX* (5% de desconto)\n` +
    `2️⃣ *Dinheiro na entrega*\n\n` +
    `Digite o número da opção.`
  )
}
registerHandler('endereco', handleEndereco)

// ─── Pagamento ──────────────────────────────────────────────────────────────

async function handlePagamento(sock: WASocket, msg: proto.IWebMessageInfo, session: WhatsAppSession) {
  const text = extractText(msg)?.trim()
  const from = msg.key.remoteJid!

  if (text?.toLowerCase() === 'voltar') {
    await updateSession(session.phoneNumber, { state: 'endereco' })
    await sendMessage(sock, from, '📍 *Informe seu endereço de entrega:*')
    return
  }

  const total = session.carrinho.reduce((sum, it) => sum + it.subtotal, 0)
  let formaPagamento: 'pix' | 'dinheiro'
  let desconto = 0
  let totalFinal = total

  if (text === '1') {
    formaPagamento = 'pix'
    desconto = total * 0.05
    totalFinal = total - desconto
  } else if (text === '2') {
    formaPagamento = 'dinheiro'
  } else {
    await sendMessage(sock, from, '⚠️ *Opção inválida.*\n\nDigite:\n1️⃣ para *PIX*\n2️⃣ para *Dinheiro na entrega*')
    return
  }

  const orderId = uuidv4().slice(0, 8).toUpperCase()
  const now = new Date()

  const orderItems: OrderItem[] = session.carrinho.map(item => ({
    productId: item.productId,
    nome: item.nome,
    preco: item.preco,
    qtd: item.qtd,
    subtotal: item.subtotal,
  }))

  const order: Omit<Order, 'id'> = {
    clienteUid: session.clienteUid || '',
    clienteNome: 'Cliente WhatsApp',
    clienteTelefone: session.phoneNumber,
    clienteEndereco: session.enderecoTemp || '',
    itens: orderItems,
    subtotal: total,
    total: totalFinal,
    taxaEntrega: 0,
    desconto,
    formaPagamento,
    status: 'pendente',
    origem: 'whatsapp',
    dataIso: now.toISOString(),
  }

  await db.collection('orders').doc(orderId).set(order)
  await updateSession(session.phoneNumber, { 
    state: 'confirmacao', 
    ordemTempId: orderId 
  })

  let confirmMsg = `📋 *PEDIDO #${orderId}*\n\n`
  confirmMsg += `📦 Itens:\n`
  orderItems.forEach(item => {
    confirmMsg += `  • ${item.qtd}x ${item.nome} — R$ ${item.subtotal.toFixed(2)}\n`
  })
  confirmMsg += `\n💰 Subtotal: R$ ${total.toFixed(2)}`
  if (desconto > 0) confirmMsg += `\n🏷️ Desconto PIX: -R$ ${desconto.toFixed(2)}`
  confirmMsg += `\n💳 *TOTAL: R$ ${totalFinal.toFixed(2)}*`
  confirmMsg += `\n\n📍 Entrega: ${session.enderecoTemp}`
  confirmMsg += `\n💳 Pagamento: ${formaPagamento === 'pix' ? 'PIX' : 'Dinheiro na entrega'}`
  confirmMsg += `\n\n✅ Pedido realizado com sucesso!`
  confirmMsg += `\n\nAguarde a confirmação. Você receberá atualizações aqui.`

  if (formaPagamento === 'pix') {
    confirmMsg += `\n\n📱 *Em breve enviaremos o QR Code PIX para pagamento.*`
  }

  await sendMessage(sock, from, confirmMsg)
  logger.info({ orderId, total: totalFinal, phone: session.phoneNumber }, 'Novo pedido WhatsApp')

  setTimeout(() => resetSession(session.phoneNumber), 5000)
}
registerHandler('pagamento', handlePagamento)

// ─── Confirmação ────────────────────────────────────────────────────────────

async function handleConfirmacao(sock: WASocket, msg: proto.IWebMessageInfo, session: WhatsAppSession) {
  const from = msg.key.remoteJid!
  await sendMessage(sock, from, '✅ *Seu pedido foi recebido!*\n\nEm breve você receberá atualizações sobre o status.\n\nObrigado por escolher a Bola AI Express! 🚀')
}
registerHandler('confirmacao', handleConfirmacao)

// ─── Aguardando Humano ──────────────────────────────────────────────────────

async function handleAguardandoHumano(sock: WASocket, msg: proto.IWebMessageInfo, session: WhatsAppSession) {
  const from = msg.key.remoteJid!
  await sendMessage(sock, from, '⏳ *Você está na fila de atendimento.*\n\nUm atendente irá te responder em breve. Aguarde!')
}
registerHandler('aguardando_humano', handleAguardandoHumano)

// ─── Listar Pedidos ─────────────────────────────────────────────────────────

async function handleListarPedidos(sock: WASocket, session: WhatsAppSession, msg: proto.IWebMessageInfo) {
  const from = msg.key.remoteJid!

  if (!session.clienteUid) {
    await sendMessage(sock, from, '📋 *Você ainda não tem pedidos registrados.*\n\nFaça seu primeiro pedido digitando *1* no menu!')
    return
  }

  const ordersSnap = await db.collection('orders')
    .where('clienteUid', '==', session.clienteUid)
    .orderBy('dataIso', 'desc')
    .limit(5)
    .get()

  if (ordersSnap.empty) {
    await sendMessage(sock, from, '📋 *Você ainda não tem pedidos.*\n\nDigite *1* para ver o cardápio!')
    return
  }

  const statusEmoji: Record<string, string> = {
    pendente: '⏳',
    confirmado: '✅',
    preparando: '👨‍🍳',
    saiu_entrega: '🚀',
    entregue: '🎉',
    cancelado: '❌',
  }

  let msg_text = `📋 *SEUS PEDIDOS*\n\n`
  let idx = 0

  ordersSnap.forEach((doc: QueryDocumentSnapshot) => {
    const order = { id: doc.id, ...doc.data() } as Order & { id: string }
    const date = format(new Date(order.dataIso), "dd/MM HH:mm", { locale: ptBR })
    const emoji = statusEmoji[order.status] || '📦'
    idx++
    msg_text += `${idx}. *#${order.id.slice(0, 6)}* ${emoji} ${order.status.toUpperCase()}\n   📅 ${date} | 💰 R$ ${order.total.toFixed(2)}\n\n`
  })

  msg_text += `\nDigite *voltar* para o menu principal.`
  await sendMessage(sock, from, msg_text)
}

// ─── Comandos Admin ─────────────────────────────────────────────────────────

async function handleAdminCommand(sock: WASocket, msg: proto.IWebMessageInfo, session: WhatsAppSession): Promise<boolean> {
  const text = extractText(msg)?.trim() || ''
  const from = msg.key.remoteJid!

  if (!text.startsWith('#')) return false

  const parts = text.slice(1).split(' ')
  const command = parts[0].toLowerCase()

  switch (command) {
    case 'pedidos': {
      const pendingSnap = await db.collection('orders')
        .where('status', '==', 'pendente')
        .orderBy('dataIso', 'desc')
        .limit(10)
        .get()

      if (pendingSnap.empty) {
        await sendMessage(sock, from, '✅ *Nenhum pedido pendente!*')
        return true
      }

      let msg_text = `📋 *PEDIDOS PENDENTES*\n\n`
      let idx = 0
      pendingSnap.forEach((doc: QueryDocumentSnapshot) => {
        const order = { id: doc.id, ...doc.data() } as Order & { id: string }
        idx++
        msg_text += `${idx}. *#${order.id.slice(0, 6)}*\n   👤 ${order.clienteNome}\n   💰 R$ ${order.total.toFixed(2)}\n   📱 ${order.clienteTelefone}\n\n`
      })

      await sendMessage(sock, from, msg_text)
      return true
    }

    case 'estoque': {
      const lowStockSnap = await db.collection('products')
        .where('ativo', '==', true)
        .where('qtd', '<', 5)
        .orderBy('qtd')
        .get()

      if (lowStockSnap.empty) {
        await sendMessage(sock, from, '✅ *Estoque OK!* Nenhum produto abaixo do mínimo.')
        return true
      }

      let msg_text = `⚠️ *ESTOQUE BAIXO*\n\n`
      let idx = 0
      lowStockSnap.forEach((doc: QueryDocumentSnapshot) => {
        const p = { id: doc.id, ...doc.data() } as Product & { id: string }
        idx++
        msg_text += `${idx}. *${p.nome}* — ${p.qtd} restantes\n`
      })

      await sendMessage(sock, from, msg_text)
      return true
    }

    case 'vendas': {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayIso = today.toISOString()

      const todayOrdersSnap = await db.collection('orders')
        .where('dataIso', '>=', todayIso)
        .where('status', 'in', ['confirmado', 'preparando', 'saiu_entrega', 'entregue'])
        .get()

      let totalVendas = 0
      todayOrdersSnap.forEach((doc: QueryDocumentSnapshot) => {
        const order = doc.data() as Order
        totalVendas += order.total
      })

      const count = todayOrdersSnap.size
      await sendMessage(sock, from, 
        `📊 *VENDAS DE HOJE*\n\n` +
        `💰 Total: *R$ ${totalVendas.toFixed(2)}*\n` +
        `📦 Pedidos: ${count}\n` +
        `🎯 Ticket Médio: R$ ${count > 0 ? (totalVendas / count).toFixed(2) : '0.00'}`
      )
      return true
    }

    default:
      return false
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractText(msg: proto.IWebMessageInfo): string | undefined {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.buttonsResponseMessage?.selectedButtonId ||
    msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId
  ) ?? undefined
}

// ─── Main Connection ────────────────────────────────────────────────────────

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger: logger.child({ level: 'warn' }),
    printQRInTerminal: false,
    browser: ['Bola AI Express', 'Chrome', '1.0'],
  })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async (update: BaileysEventMap['connection.update']) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      logger.info('QR Code gerado - escaneie para conectar')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      logger.warn({ shouldReconnect, statusCode }, 'Conexão fechada')

      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000)
      } else {
        logger.info('Desconectado (logout).')
      }
    }

    if (connection === 'open') {
      logger.info('✅ WhatsApp conectado!')
    }
  })

  sock.ev.on('messages.upsert', async (m: BaileysEventMap['messages.upsert']) => {
    if (m.type !== 'notify') return

    for (const msg of m.messages) {
      if (!msg.key.fromMe && msg.message) {
        const from = msg.key.remoteJid!
        const phoneNumber = from.replace(/[^0-9]/g, '')

        try {
          const text = extractText(msg)
          if (text?.startsWith('#')) {
            const handled = await handleAdminCommand(sock, msg, { phoneNumber } as WhatsAppSession)
            if (handled) continue
          }

          const session = await getOrCreateSession(phoneNumber)
          const handler = stateHandlers[session.state]

          if (handler) {
            await handler(sock, msg, session)
          } else {
            await resetSession(phoneNumber)
            await handleMenu(sock, msg, { ...session, state: 'menu' })
          }
        } catch (err) {
          logger.error({ err, phone: phoneNumber }, 'Erro ao processar mensagem')
          try {
            await sendMessage(sock, from, '❌ *Ocorreu um erro.*\n\nPor favor, tente novamente ou digite *voltar* para o menu.')
          } catch { /* ignore */ }
        }
      }
    }
  })

  return sock
}

// ─── Start ──────────────────────────────────────────────────────────────────

logger.info('🚀 Iniciando Bola AI Express WhatsApp Bot...')
connectToWhatsApp().catch(err => {
  logger.fatal(err, 'Erro fatal ao conectar')
  process.exit(1)
})