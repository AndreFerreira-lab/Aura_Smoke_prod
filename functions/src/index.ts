// Firebase Functions Entry Point
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onCall, onRequest as onHttpsRequest } from 'firebase-functions/v2/https'
import { onSchedule as onScheduleV2 } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { 
  adminDb, adminAuth, adminMessaging, 
  adminOrdersCol, adminProductsCol, adminInventoryMovementsCol,
  adminWhatsAppSessionsCol, adminSettingsDoc,
  adminSerializeDoc, Timestamp, FieldValue, runTransaction
} from '@bola/firebase-config/admin'
import type { Order, Product, InventoryMovement, WhatsAppSession, Settings, PixInfo } from '@bola/shared-types'

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS — Triggers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quando um pedido é criado:
 * 1. Reserva estoque
 * 2. Cria movimentação de inventário
 * 3. Notifica admin (FCM)
 * 4. Se origem=whatsapp, notifica via bot
 */
export const onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data?.data() as Order | undefined
  if (!order) return

  const orderId = event.params.orderId
  logger.info({ orderId, origem: order.origem }, 'Novo pedido criado')

  try {
    // 1. Reserva estoque
    const batch = adminDb.batch()
    for (const item of order.itens) {
      const productRef = adminProductsCol.doc(item.productId)
      batch.update(productRef, {
        qtd: FieldValue.increment(-item.qtd),
        updatedAt: Timestamp.now(),
      })
    }
    await batch.commit()

    // 2. Cria movimentações de inventário
    for (const item of order.itens) {
      const productSnap = await adminProductsCol.doc(item.productId).get()
      const product = productSnap.data() as Product | undefined
      if (!product) continue

      const movementRef = adminInventoryMovementsCol.doc()
      const movement: Omit<InventoryMovement, 'id'> = {
        productId: item.productId,
        tipo: 'venda',
        qtd: item.qtd,
        qtdAnterior: product.qtd,
        qtdNova: product.qtd - item.qtd,
        motivo: `Venda #${orderId.slice(0, 6)}`,
        userId: order.clienteUid || 'system',
        dataIso: new Date().toISOString(),
        orderId,
      }
      await movementRef.set(movement)

      // 3. Alerta estoque baixo
      if (product.qtd - item.qtd < 5) {
        logger.warn({ product: product.nome, qtd: product.qtd - item.qtd }, 'ESTOQUE BAIXO')
        // TODO: Notificar admin via FCM
      }
    }

    // 4. Notifica admin
    try {
      const tokensSnap = await adminDb.collection('fcm_tokens')
        .where('role', 'in', ['admin', 'gerente'])
        .get()
      
      const tokens = tokensSnap.docs.map((d: any) => d.data().token).filter(Boolean)
      
      if (tokens.length > 0) {
        await adminMessaging.sendEachForMulticast({
          tokens,
          notification: {
            title: '🛒 Novo Pedido!',
            body: `Pedido #${orderId.slice(0, 6)} — R$ ${order.total.toFixed(2)} (${order.origem})`,
          },
          data: { orderId, type: 'new_order' },
        })
      }
    } catch (fcmErr) {
      logger.warn({ err: fcmErr }, 'Falha ao enviar notificação FCM')
    }

    logger.info({ orderId }, 'Pedido processado com sucesso')
  } catch (err) {
    logger.error({ err, orderId }, 'Erro ao processar pedido')
  }
})

/**
 * Quando status do pedido muda:
 * 1. Notifica cliente via FCM
 * 2. Se origem=whatsapp, envia msg no WhatsApp
 */
export const onOrderStatusChanged = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data?.before.data() as Order | undefined
  const after = event.data?.after.data() as Order | undefined
  
  if (!before || !after || before.status === after.status) return

  const orderId = event.params.orderId
  logger.info({ orderId, from: before.status, to: after.status }, 'Status do pedido alterado')

  const statusMessages: Record<string, string> = {
    confirmado: '✅ Seu pedido foi *confirmado*!',
    preparando: '👨‍🍳 Seu pedido está sendo *preparado*!',
    saiu_entrega: '🚀 Seu pedido *saiu para entrega*!',
    entregue: '🎉 Seu pedido foi *entregue*! Obrigado!',
    cancelado: '❌ Seu pedido foi *cancelado*.',
  }

  const message = statusMessages[after.status]
  if (!message) return

  // Notifica via FCM
  try {
    if (after.clienteUid) {
      const tokensSnap = await adminDb.collection('fcm_tokens')
        .where('userId', '==', after.clienteUid)
        .get()
      
      const tokens = tokensSnap.docs.map((d: any) => d.data().token).filter(Boolean)
      
      if (tokens.length > 0) {
        await adminMessaging.sendEachForMulticast({
          tokens,
          notification: {
            title: `Pedido #${orderId.slice(0, 6)}`,
            body: message.replace(/\*/g, ''),
          },
          data: { orderId, type: 'status_change', status: after.status },
        })
      }
    }
  } catch (fcmErr) {
    logger.warn({ err: fcmErr }, 'Falha ao enviar FCM')
  }

  // Notifica via WhatsApp (se origem whatsapp)
  if (after.origem === 'whatsapp' && after.clienteTelefone) {
    try {
      const sessionSnap = await adminWhatsAppSessionsCol.doc(after.clienteTelefone).get()
      if (sessionSnap.exists) {
        // O bot vai pegar a mudança via listener no Firestore
        // Aqui só atualizamos um campo de "última notificação"
        await adminWhatsAppSessionsCol.doc(after.clienteTelefone).update({
          ultimaNotificacao: message,
          ultimaInteracao: new Date().toISOString(),
        })
      }
    } catch (waErr) {
      logger.warn({ err: waErr }, 'Falha ao notificar WhatsApp')
    }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// PIX — Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cria cobrança PIX (Mercado Pago)
 * POST /createPix
 */
export const createPix = onCall(async (request) => {
  const { orderId, valor, descricao } = request.data
  
  if (!orderId || !valor) {
    throw new Error('orderId e valor são obrigatórios')
  }

  try {
    // TODO: Integrar com Mercado Pago SDK
    // Por enquanto, retorna mock
    const settingsSnap = await adminSettingsDoc.get()
    const settings = settingsSnap.data() as Settings | undefined

    const pixData: PixInfo = {
      txid: `BOLA${Date.now().toString(36).toUpperCase()}`,
      qrCode: '00020101021226870014br.gov.bcb.pix2565qrcodepix.mercadopago.com/instore/p/v2/...',
      qrCodeBase64: '', // TODO: gerar QR Code em base64
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30min
      status: 'pending',
      merchantName: settings?.pixConfig.merchantName || 'Bola AI Express',
      merchantCity: settings?.pixConfig.merchantCity || 'Sao Paulo',
    }

    // Atualiza pedido com dados PIX
    await adminOrdersCol.doc(orderId).update({
      pix: pixData,
      updatedAt: Timestamp.now(),
    })

    logger.info({ orderId, txid: pixData.txid }, 'PIX criado')

    return { success: true, pix: pixData }
  } catch (err) {
    logger.error({ err, orderId }, 'Erro ao criar PIX')
    throw new Error('Falha ao gerar cobrança PIX')
  }
})

/**
 * Webhook PIX (Mercado Pago)
 * POST /webhookPix
 */
export const webhookPix = onHttpsRequest(async (req, res) => {
  try {
    const { type, data } = req.body

    if (type !== 'payment') {
      res.status(200).send('OK')
      return
    }

    const paymentId = data?.id
    if (!paymentId) {
      res.status(400).send('Missing payment ID')
      return
    }

    // TODO: Consultar pagamento no Mercado Pago
    // Por enquanto, busca pedido pelo txid
    const ordersSnap = await adminOrdersCol
      .where('pix.txid', '==', paymentId.toString())
      .limit(1)
      .get()

    if (ordersSnap.empty) {
      logger.warn({ paymentId }, 'Pedido não encontrado para PIX')
      res.status(404).send('Order not found')
      return
    }

    const orderDoc = ordersSnap.docs[0]
    const order = orderDoc.data() as Order

    // Atualiza status do PIX
    await orderDoc.ref.update({
      'pix.status': 'paid',
      status: 'confirmado',
      updatedAt: Timestamp.now(),
    })

    logger.info({ orderId: orderDoc.id, paymentId }, 'PIX aprovado')

    // Cria lançamento financeiro
    await adminDb.collection('financial').add({
      tipo: 'receita',
      categoria: 'venda_produto',
      valor: order.total,
      descricao: `Venda #${orderDoc.id.slice(0, 6)} via PIX`,
      formaPagamento: 'pix',
      status: 'realizado',
      orderId: orderDoc.id,
      dataIso: new Date().toISOString(),
      userId: 'system',
    } as Omit<import('@bola/shared-types').FinancialEntry, 'id'>)

    res.status(200).send('OK')
  } catch (err) {
    logger.error({ err }, 'Erro no webhook PIX')
    res.status(500).send('Internal error')
  }
})

/**
 * Expira PIXs pendentes (roda a cada 5 min)
 */
export const expirePix = onScheduleV2('every 5 minutes', async () => {
  const now = new Date().toISOString()

  const expiredSnap = await adminOrdersCol
    .where('pix.status', '==', 'pending')
    .where('pix.expiresAt', '<', now)
    .get()

  if (expiredSnap.empty) return

  const batch = adminDb.batch()

  for (const doc of expiredSnap.docs) {
    batch.update(doc.ref, {
      'pix.status': 'expired',
      status: 'cancelado',
      updatedAt: Timestamp.now(),
    })

    // Devolve estoque
    const order = doc.data() as Order
    for (const item of order.itens) {
      const productRef = adminProductsCol.doc(item.productId)
      batch.update(productRef, {
        qtd: FieldValue.increment(item.qtd),
      })
    }
  }

  await batch.commit()
  logger.info({ count: expiredSnap.size }, 'PIXs expirados processados')
})

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY — Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ajuste de estoque (entrada/saída/ajuste)
 * POST /adjustInventory
 */
export const adjustInventory = onCall(async (request) => {
  const { productId, tipo, qtd, motivo } = request.data
  const userId = request.auth?.uid

  if (!productId || !tipo || !qtd || !userId) {
    throw new Error('productId, tipo, qtd e autenticação são obrigatórios')
  }

  try {
    const result = await runTransaction(async (transaction: any) => {
      const productRef = adminProductsCol.doc(productId)
      const productSnap = await transaction.get(productRef)
      
      if (!productSnap.exists) throw new Error('Produto não encontrado')
      
      const product = productSnap.data() as Product
      const qtdAnterior = product.qtd
      let qtdNova: number

      switch (tipo) {
        case 'entrada':
          qtdNova = qtdAnterior + qtd
          break
        case 'saida':
          qtdNova = qtdAnterior - qtd
          if (qtdNova < 0) throw new Error('Estoque insuficiente')
          break
        case 'ajuste':
          qtdNova = qtd
          break
        default:
          throw new Error('Tipo inválido')
      }

      transaction.update(productRef, {
        qtd: qtdNova,
        updatedAt: Timestamp.now(),
      })

      const movementRef = adminInventoryMovementsCol.doc()
      const movement: Omit<InventoryMovement, 'id'> = {
        productId,
        tipo,
        qtd,
        qtdAnterior,
        qtdNova,
        motivo: motivo || `Ajuste manual (${tipo})`,
        userId,
        dataIso: new Date().toISOString(),
      }
      transaction.set(movementRef, movement)

      return { qtdAnterior, qtdNova }
    })

    logger.info({ productId, tipo, qtd, result }, 'Estoque ajustado')
    return { success: true, ...result }
  } catch (err) {
    logger.error({ err, productId }, 'Erro ao ajustar estoque')
    throw new Error('Falha ao ajustar estoque')
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registra token FCM do usuário
 * POST /registerFcmToken
 */
export const registerFcmToken = onCall(async (request) => {
  const { token } = request.data
  const userId = request.auth?.uid

  if (!token || !userId) {
    throw new Error('token e autenticação são obrigatórios')
  }

  try {
    // Busca role do usuário
    const userRecord = await adminAuth.getUser(userId)
    const role = userRecord.customClaims?.role || 'client'

    await adminDb.collection('fcm_tokens').doc(`${userId}_${token.slice(-8)}`).set({
      userId,
      token,
      role,
      platform: 'web',
      createdAt: Timestamp.now(),
    })

    return { success: true }
  } catch (err) {
    logger.error({ err }, 'Erro ao registrar FCM token')
    throw new Error('Falha ao registrar token')
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS — Scheduled Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Relatório diário (roda todo dia às 23:59)
 */
export const dailyReport = onScheduleV2('59 23 * * *', async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()

  const ordersSnap = await adminOrdersCol
    .where('dataIso', '>=', todayIso)
    .get()

  let totalVendas = 0
  let totalPedidos = 0
  let totalItens = 0
  const porFormaPagamento: Record<string, number> = {}
  const porStatus: Record<string, number> = {}

  ordersSnap.docs.forEach((doc: any) => {
    const order = doc.data() as Order
    totalPedidos++
    totalVendas += order.total
    totalItens += order.itens.reduce((sum, i) => sum + i.qtd, 0)
    porFormaPagamento[order.formaPagamento] = (porFormaPagamento[order.formaPagamento] || 0) + order.total
    porStatus[order.status] = (porStatus[order.status] || 0) + 1
  })

  const report = {
    data: todayIso,
    totalVendas,
    totalPedidos,
    totalItens,
    ticketMedio: totalPedidos > 0 ? totalVendas / totalPedidos : 0,
    porFormaPagamento,
    porStatus,
    createdAt: Timestamp.now(),
  }

  await adminDb.collection('reports').doc(`daily_${today.toISOString().slice(0, 10)}`).set(report)
  logger.info(report, 'Relatório diário gerado')
})

/**
 * Relatório semanal (roda todo domingo às 23:58)
 */
export const weeklyReport = onScheduleV2('58 23 * * 0', async () => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const ordersSnap = await adminOrdersCol
    .where('dataIso', '>=', weekAgo.toISOString())
    .get()

  let totalVendas = 0
  let totalPedidos = 0
  const porDia: Record<string, number> = {}

  ordersSnap.docs.forEach((doc: any) => {
    const order = doc.data() as Order
    totalPedidos++
    totalVendas += order.total
    const dia = order.dataIso.slice(0, 10)
    porDia[dia] = (porDia[dia] || 0) + order.total
  })

  const report = {
    periodo: { inicio: weekAgo.toISOString(), fim: now.toISOString() },
    totalVendas,
    totalPedidos,
    ticketMedio: totalPedidos > 0 ? totalVendas / totalPedidos : 0,
    porDia,
    createdAt: Timestamp.now(),
  }

  await adminDb.collection('reports').doc(`weekly_${now.toISOString().slice(0, 10)}`).set(report)
  logger.info(report, 'Relatório semanal gerado')
})