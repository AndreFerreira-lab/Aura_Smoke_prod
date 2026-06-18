import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '@bola/firebase-config/client'
import type { User, UserProfile, UserConfig } from '@bola/shared-types'

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, profile: UserProfile) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
          if (userDoc.exists()) {
            setUser({ uid: fbUser.uid, ...userDoc.data() } as User)
          } else {
            setUser(null)
          }
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signUp(email: string, password: string, profile: UserProfile) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const config: UserConfig = {
      notificacoes: { whatsapp: true, email: false, push: true },
    }
    const newUser: Omit<User, 'uid'> = {
      email,
      role: 'client',
      profile,
      config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), newUser)
    await updateProfile(cred.user, { displayName: profile.nome })
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid))
    if (!userDoc.exists()) {
      const profile: UserProfile = {
        nome: cred.user.displayName || '',
        telefone: '',
        endereco: '',
        numero: '',
        cep: '',
        pagamentoPreferido: 'pix',
      }
      const config: UserConfig = {
        notificacoes: { whatsapp: true, email: false, push: true },
      }
      const newUser: Omit<User, 'uid'> = {
        email: cred.user.email || '',
        role: 'client',
        profile,
        config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const userData = { uid: cred.user.uid, ...newUser } as User
      await setDoc(doc(db, 'users', cred.user.uid), newUser)
      setUser(userData)
    } else {
      setUser({ uid: cred.user.uid, ...userDoc.data() } as User)
    }
  }

  async function signOut() {
    await firebaseSignOut(auth)
    setUser(null)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}