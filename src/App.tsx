import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ProtectedRoute, PublicOnlyRoute } from './lib/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { HomePage } from './features/home/HomePage'
import { HistoryPage } from './features/history/HistoryPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { BottomNav } from './components/BottomNav'
import { fetchProfile } from './lib/profile'
import { startLocalReminders } from './lib/notifications'

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{children}</div>
      <BottomNav />
    </div>
  )
}

/** Keeps Type A (foreground) reminders running no matter which page is open. */
function LocalReminders() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    let stop = () => {}
    let cancelled = false

    fetchProfile(user.id).then((profile) => {
      if (!cancelled && profile.onboarded) stop = startLocalReminders(profile)
    })

    return () => {
      cancelled = true
      stop()
    }
  }, [user])

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LocalReminders />
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <HomePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <HistoryPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ProfilePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
