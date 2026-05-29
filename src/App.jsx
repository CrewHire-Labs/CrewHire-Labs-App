import { AuthProvider, useAuth } from './lib/AuthContext'
import AuthPage         from './pages/AuthPage'
import OnboardingWizard from './pages/OnboardingWizard'
import Dashboard        from './pages/Dashboard'
import BrandSettings    from './pages/BrandSettings'

function Router() {
  const { user, brand, loading } = useAuth()
  const path = window.location.pathname

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border border-[#00E87A] border-t-transparent anim-spin"/>
          <span className="terminal-text text-[11px] opacity-30">LOADING CREWHIRE LABS...</span>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) return <AuthPage />

  // Brand settings page — must be logged in + have brand
  if (path === '/settings' && brand) return <BrandSettings />

  // No brand or not onboarded → onboarding
  if (!brand || !brand.onboarded) {
    if (path !== '/onboarding') window.history.replaceState({}, '', '/onboarding')
    return <OnboardingWizard />
  }

  // Dashboard (default)
  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <div className="grain" aria-hidden="true"/>
      <Router />
    </AuthProvider>
  )
}
