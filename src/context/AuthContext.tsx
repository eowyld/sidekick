'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import posthog from 'posthog-js'
import { createClient } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  signInWithGoogle: (nextPath?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    initialize()

    // Écoute les changements (Login, Logout, Token refreshed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_IN' && session?.user) {
        posthog.identify(session.user.id, {
          email: session.user.email,
        })
      }
      if (event === 'SIGNED_OUT') {
        posthog.reset()
      }

      // Force Next.js à rafraîchir les Server Components (utile pour la RLS)
      router.refresh()
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  const signInWithGoogle = async (nextPath = '/dashboard') => {
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    callbackUrl.searchParams.set('next', nextPath)

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    })
  }

  const signOut = async () => {
    posthog.capture('signed_out')
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return context
}
