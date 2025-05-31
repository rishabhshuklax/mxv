'use client'

import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/header"
import { LoadingPage } from "@/components/loading"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <LoadingPage />
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {children}
      </main>
    </>
  )
}
