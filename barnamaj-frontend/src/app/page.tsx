'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import BentoGrid from '@/components/BentoGrid'
import FeaturesSection from '@/components/FeaturesSection'
import Footer from '@/components/Footer'
import AuthModal from '@/components/AuthModal'

type AuthMode = 'login' | 'register'
type AccountType = 'Client' | 'Developer'

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authAccountType, setAuthAccountType] = useState<AccountType>('Developer')

  const openLogin = () => {
    setAuthMode('login')
    setModalOpen(true)
  }

  const openRegister = (type: AccountType = 'Developer') => {
    setAuthMode('register')
    setAuthAccountType(type)
    setModalOpen(true)
  }

  const handleAuthSuccess = (token: string) => {
    console.log('Auth success, token stored:', token.substring(0, 20) + '...')
    // Optionally redirect to dashboard, etc.
    setModalOpen(false)
  }

  return (
    <main className="relative min-h-screen bg-background">
      <Navbar
        onLoginClick={openLogin}
        onRegisterClick={() => openRegister('Developer')}
      />

      <HeroSection
        onRegisterClick={() => openRegister('Developer')}
        onLoginClick={openLogin}
      />

      <BentoGrid onRegisterClick={openRegister} />

      <FeaturesSection />

      <Footer />

      <AuthModal
        isOpen={modalOpen}
        initialMode={authMode}
        initialAccountType={authAccountType}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </main>
  )
}
