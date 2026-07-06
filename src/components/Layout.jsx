import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/parts', label: 'Parts & Inventory', icon: '🔩' },
  { to: '/models', label: 'Robot Models', icon: '🤖' },
  { to: '/planner', label: 'Production Planner', icon: '🏭' },
  { to: '/purchasing', label: 'Purchasing Tracker', icon: '🛒' },
]

const COLLAPSE_KEY = 'sidebar-collapsed'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === 'true')

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, String(next))
      return next
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-gray-900 flex flex-col flex-shrink-0 transition-all duration-200`}>
        <div className="px-5 py-5 border-b border-gray-700 flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">AregAI</p>
              <h1 className="text-white font-bold text-lg leading-tight whitespace-nowrap">MRP System</h1>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-sky-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span>{icon}</span>
              {!collapsed && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-700">
          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span>🚪</span>
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
