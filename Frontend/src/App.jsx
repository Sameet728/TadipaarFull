import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CriminalsList from './pages/CriminalsList'
import CriminalProfile from './pages/CriminalProfile'
import RegisterCriminal from './pages/RegisterCriminal'
import Violations from './pages/Violations'
import MissedCheckIns from './pages/MissedCheckIns'
import AddAdmin from './pages/AddAdmin'
import DownloadApp from './pages/DownloadApp'
import CapturePhoto from './pages/CapturePhoto'

const PrivateRoute = ({ children }) => {
  const { auth } = useAuth()
  return auth ? children : <Navigate to="/login" replace />
}

const AppRoutes = () => {
  const { auth, loading } = useAuth()
  
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <Loader2 size={40} className="animate-spin text-[#1E3A8A]" />
      <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Initializing System...</p>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={auth ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="criminals"      element={<CriminalsList />} />
        <Route path="criminals/:id"  element={<CriminalProfile />} />
        <Route path="register"       element={<RegisterCriminal />} />
        <Route path="add-admin"      element={<AddAdmin />} />
        <Route path="violations"     element={<Violations />} />
        <Route path="missed"         element={<MissedCheckIns />} />
      </Route>
      <Route path="/download" element={<DownloadApp />} />
      <Route path="/capture/:uploadId" element={<CapturePhoto />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}