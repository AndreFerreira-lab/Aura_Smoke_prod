import { App } from 'firebase-admin/app';
import { Auth } from 'firebase-admin/auth';
import { Firestore } from 'firebase-admin/firestore';
import { Storage } from 'firebase-admin/storage';
import { Messaging } from 'firebase-admin/messaging';
declare let adminApp: App;
export declare const adminAuth: Auth;
export declare const adminDb: Firestore;
export declare const adminStorage: Storage;
export declare const adminMessaging: Messaging;
export declare const adminUsersCol: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
export declare const adminProductsCol: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
export declare const adminOrdersCol: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
export declare const adminInventoryMovementsCol: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
export declare const adminFinancialCol: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
export declare const adminSuppliersCol: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
export declare const adminWhatsAppSessionsCol: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
export declare const adminSettingsDoc: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
export type { User, UserProfile, UserConfig, UserRole, Product, CartItem, Order, OrderItem, OrderStatus, OrderOrigin, PaymentMethod, PixInfo, InventoryMovement, InventoryMovementType, FinancialEntry, FinancialType, FinancialCategory, FinancialStatus, Supplier, WhatsAppSession, WhatsAppState, Settings, DashboardStats, FinancialSummary } from '@bola/shared-types';
import { Timestamp, FieldValue, WriteBatch } from 'firebase-admin/firestore';
export { Timestamp, FieldValue, WriteBatch };
export declare function adminToISO(ts: Timestamp | Date | string | number): string;
export declare function adminFromISO(iso: string): Timestamp;
export declare function adminSerializeDoc<T extends {
    id?: string;
}>(docSnap: import('firebase-admin/firestore').DocumentSnapshot<T>): T & {
    id: string;
};
export declare function adminSerializeQuery<T extends {
    id?: string;
}>(querySnap: import('firebase-admin/firestore').QuerySnapshot<T>): (T & {
    id: string;
})[];
export declare function createBatch(): WriteBatch;
export declare function runTransaction<T>(updateFunction: (transaction: import('firebase-admin/firestore').Transaction) => Promise<T>): Promise<T>;
export declare function isAdmin(uid: string): Promise<boolean>;
export declare function setUserRole(uid: string, role: string): Promise<void>;
export declare function sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>): Promise<string>;
export declare function sendMulticastNotification(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<import('firebase-admin/messaging').BatchResponse>;
export { adminApp };
export default adminApp;
