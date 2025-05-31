'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { userAPI, User } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  const refreshUser = async () => {
    try {
      if (typeof window === 'undefined') return
      
      const token = localStorage.getItem('authToken')
      if (!token) {
        setUser(null)
        return
      }

      const currentUser = await userAPI.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      // Token is invalid, remove it
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken')
      }
      setUser(null)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await userAPI.login(email, password)
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', response.token)
    }
    await refreshUser()
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
    }
    setUser(null)
  }

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      await refreshUser()
      setIsLoading(false)
    }

    initAuth()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
