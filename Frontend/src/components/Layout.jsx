import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useRoleLabel } from '../hooks/useJurisdiction'

export default function Layout() {
  const [open, setOpen] = useState(true)
  const { auth } = useAuth()
  const label = useRoleLabel()

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar open={open} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(o => !o)} className="text-gray-500 hover:text-gray-700">
              <Menu size={22} />
            </button>
            <div>
              <p className="text-xs text-gray-400">Maharashtra Police</p>
              <p className="text-sm font-semibold text-gray-700">{label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-police-600 flex items-center justify-center text-white text-sm font-bold">
              {auth?.userName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <span className="text-sm text-gray-600 hidden sm:block">{auth?.userName || 'Admin'}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
