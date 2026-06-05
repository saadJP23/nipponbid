import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from 'react-hot-toast'

import Layout    from './components/Layout'
import Login     from './pages/Login'
import Register  from './pages/Register'

import Dashboard     from './pages/Dashboard'
import Auctions      from './pages/Auctions'
import MyPurchases   from './pages/MyPurchases'
import MyBids        from './pages/MyBids'
import Shipments     from './pages/Shipments'
import MyParts       from './pages/MyParts'
import Remittances   from './pages/Remittance'
import Invoices      from './pages/Invoices'
import Accounting    from './pages/Accounting'
import Notifications from './pages/Notifications'
import Profile       from './pages/Profile'

import AdminUsers       from './pages/admin/AdminUsers'
import AdminPurchases   from './pages/admin/AdminPurchases'
import AdminBids        from './pages/admin/AdminBids'
import AdminShipments   from './pages/admin/AdminShipments'
import AdminParts       from './pages/admin/AdminParts'
import AdminRemittances from './pages/admin/AdminRemittances'
import AdminInvoices    from './pages/admin/AdminInvoices'
import AdminAccounting  from './pages/admin/AdminAccounting'

import LoadingSpinner from './components/LoadingSpinner'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user)   return <Navigate to="/login" replace />
  return children
}
function AdminOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}
function GuestOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (user)    return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>
        <Route path="/login"    element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

        <Route element={<Protected><Layout /></Protected>}>
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/auctions"      element={<Auctions />} />
          <Route path="/my-purchases"  element={<MyPurchases />} />
          <Route path="/my-bids"       element={<MyBids />} />
          <Route path="/shipments"     element={<Shipments />} />
          <Route path="/my-parts"      element={<MyParts />} />
          <Route path="/remittances"   element={<Remittances />} />
          <Route path="/invoices"      element={<Invoices />} />
          <Route path="/accounting"    element={<Accounting />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile"       element={<Profile />} />

          <Route path="/admin/users"       element={<AdminOnly><AdminUsers /></AdminOnly>} />
          <Route path="/admin/purchases"   element={<AdminOnly><AdminPurchases /></AdminOnly>} />
          <Route path="/admin/bids"        element={<AdminOnly><AdminBids /></AdminOnly>} />
          <Route path="/admin/shipments"   element={<AdminOnly><AdminShipments /></AdminOnly>} />
          <Route path="/admin/parts"       element={<AdminOnly><AdminParts /></AdminOnly>} />
          <Route path="/admin/remittances" element={<AdminOnly><AdminRemittances /></AdminOnly>} />
          <Route path="/admin/invoices"    element={<AdminOnly><AdminInvoices /></AdminOnly>} />
          <Route path="/admin/accounting"  element={<AdminOnly><AdminAccounting /></AdminOnly>} />
        </Route>

        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Analytics />
    </AuthProvider>
  )
}
