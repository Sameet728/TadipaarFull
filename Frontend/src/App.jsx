import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CriminalsList from './pages/CriminalsList'
import CriminalProfile from './pages/CriminalProfile'
import RegisterCriminal from './pages/RegisterCriminal'
import Violations from './pages/Violations'
import MissedCheckIns from './pages/MissedCheckIns'

const PrivateRoute = ({ children }) => {
  const { auth, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-police-900 flex items-center justify-center">
      <div className="text-center">
        <span className="text-5xl">🚔</span>
        <p className="text-white mt-3 text-sm">Loading...</p>
      </div>
    </div>
  )
  return auth ? children : <Navigate to="/login" replace />
}

const AppRoutes = () => {
  const { auth, loading } = useAuth()
  if (loading) return null

  return (
    <Routes>
      <Route path="/login" element={auth ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="criminals"      element={<CriminalsList />} />
        <Route path="criminals/:id"  element={<CriminalProfile />} />
        <Route path="register"       element={<RegisterCriminal />} />
        <Route path="violations"     element={<Violations />} />
        <Route path="missed"         element={<MissedCheckIns />} />
      </Route>
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