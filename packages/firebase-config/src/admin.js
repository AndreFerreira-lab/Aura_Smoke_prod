// Firebase Admin SDK - Para Firebase Functions, WhatsApp Bot, Scripts backend
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';
// Configuração do Service Account
// Em produção: use GOOGLE_APPLICATION_CREDENTIALS ou Firebase Functions env
// Em dev: use arquivo local ou variáveis de ambiente
let adminApp;
function getServiceAccount() {
    // 1. Tenta arquivo local (dev)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            return require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        }
        catch {
            console.warn('[Firebase Admin] Arquivo service account não encontrado');
        }
    }
    // 2. Tenta variáveis de ambiente individuais
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (projectId && clientEmail && privateKey) {
        return { projectId, clientEmail, privateKey };
    }
    // 3. Tenta JSON completo em variável
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
            return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        }
        catch {
            console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON inválido');
        }
    }
    return undefined;
}
const serviceAccount = getServiceAccount();
if (getApps().length === 0) {
    if (serviceAccount) {
        adminApp = initializeApp({ credential: cert(serviceAccount) });
    }
    else {
        // Em Firebase Functions/Cloud Run, usa Application Default Credentials
        adminApp = initializeApp();
    }
}
else {
    adminApp = getApps()[0];
}
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export const adminMessaging = getMessaging(adminApp);
// Configurações do Firestore Admin
adminDb.settings({
    ignoreUndefinedProperties: true
});
// Helpers de coleções (usam mesmos nomes do client)
export const adminUsersCol = adminDb.collection('users');
export const adminProductsCol = adminDb.collection('products');
export const adminOrdersCol = adminDb.collection('orders');
export const adminInventoryMovementsCol = adminDb.collection('inventory_movements');
export const adminFinancialCol = adminDb.collection('financial');
export const adminSuppliersCol = adminDb.collection('suppliers');
export const adminWhatsAppSessionsCol = adminDb.collection('whatsapp_sessions');
export const adminSettingsDoc = adminDb.doc('settings/general');
// Utilitários Admin
import { Timestamp, FieldValue, WriteBatch } from 'firebase-admin/firestore';
export { Timestamp, FieldValue, WriteBatch };
// Converte Timestamp Admin para ISO
export function adminToISO(ts) {
    if (ts instanceof Timestamp)
        return ts.toDate().toISOString();
    if (ts instanceof Date)
        return ts.toISOString();
    if (typeof ts === 'string')
        return ts;
    return new Date(ts).toISOString();
}
// Converte ISO para Timestamp Admin
export function adminFromISO(iso) {
    return Timestamp.fromDate(new Date(iso));
}
// Serializa DocumentSnapshot Admin
export function adminSerializeDoc(docSnap) {
    return { id: docSnap.id, ...docSnap.data() };
}
// Serializa QuerySnapshot Admin
export function adminSerializeQuery(querySnap) {
    return querySnap.docs.map(adminSerializeDoc);
}
// Batch helper para operações em lote
export function createBatch() {
    return adminDb.batch();
}
// Transação helper
export async function runTransaction(updateFunction) {
    return adminDb.runTransaction(updateFunction);
}
// Verifica se usuário é admin (custom claim)
export async function isAdmin(uid) {
    try {
        const user = await adminAuth.getUser(uid);
        return user.customClaims?.role === 'admin' || user.customClaims?.role === 'gerente';
    }
    catch {
        return false;
    }
}
// Define custom claims (role)
export async function setUserRole(uid, role) {
    await adminAuth.setCustomUserClaims(uid, { role });
}
// Envia notificação push (FCM)
export async function sendPushNotification(token, title, body, data) {
    return adminMessaging.send({
        token,
        notification: { title, body },
        data: data || {},
        android: { priority: 'high' },
        apns: { payload: { aps: { contentAvailable: true } } },
    });
}
// Envia notificação para múltiplos tokens
export async function sendMulticastNotification(tokens, title, body, data) {
    return adminMessaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: data || {},
    });
}
export { adminApp };
export default adminApp;
