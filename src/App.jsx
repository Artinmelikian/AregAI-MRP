import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase, supabaseConfigured } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Parts from './pages/Parts'
import Models from './pages/Models'
import Planner from './pages/Planner'
import Purchasing from './pages/Purchasing'
import Logistics from './pages/Logistics'

function AuthGuard({ children }) {
  const [session, setSession] = useState(undefined)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return children
}

function SetupRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-lg text-center space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">AregAI MRP</p>
        <h1 className="text-xl font-bold text-gray-900">Supabase Setup Required</h1>
        <p className="text-sm text-gray-600">
          Copy <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local.example</code> to{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code> and add your Supabase project URL and anon key, then restart the dev server.
        </p>
        <div className="bg-gray-900 text-green-400 text-xs font-mono text-left rounded-lg p-4">
          <p>VITE_SUPABASE_URL=https://xxx.supabase.co</p>
          <p>VITE_SUPABASE_ANON_KEY=eyJ...</p>
        </div>
        <p className="text-xs text-gray-400">
          Find these in: Supabase Dashboard → Project Settings → API
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!supabaseConfigured) return <SetupRequired />

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/parts" element={<Parts />} />
                  <Route path="/models" element={<Models />} />
                  <Route path="/planner" element={<Planner />} />
                  <Route path="/purchasing" element={<Purchasing />} />
                  <Route path="/logistics" element={<Logistics />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </AuthGuard>
          }
        />
      </Routes>
    </>
  )
}
