import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Analytics } from '@vercel/analytics/react'

import Layout from './components/Layout'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LoadingSpinner from './components/LoadingSpinner'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import CarDetail from './pages/CarDetail'

import Dashboard from './pages/Dashboard'
import AnalyticsPage from './pages/Analytics'

import JapaneseAuctions from './pages/JapaneseAuctions'
import JapaneseCarDetail from './pages/JapaneseCarDetail'
import Parts from './pages/Parts'

import MyJapanPurchases from './pages/MyJapanPurchases'
import MyBids from './pages/MyBids'
import MyPurchases from './pages/MyPurchases'
import PurchaseDetail from './pages/PurchaseDetail'
import MyParts from './pages/MyParts'
import Watchlist from './pages/Watchlist'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import SubClients from './pages/SubClients'

import Remittance from './pages/Remittance'
import Shipments from './pages/Shipments'
import Invoices from './pages/Invoices'
import Accounting from './pages/Accounting'

import AdminBids from './pages/admin/AdminBids'
import AdminUsers from './pages/admin/AdminUsers'
import AdminJapanPurchases from './pages/admin/AdminJapanPurchases'
import AdminParts from './pages/admin/AdminParts'
import AdminShipments from './pages/admin/AdminShipments'
import AdminRemittances from './pages/admin/AdminRemittances'
import AdminInvoices from './pages/admin/AdminInvoices'
import AdminAccounting from './pages/admin/AdminAccounting'
import AdminJapanBids from './pages/admin/AdminJapanBids'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function PublicLayout({ children, noFooter }) {
  return (
    <div data-theme="light" className="min-h-screen flex flex-col" style={{ background: 'var(--ae-canvas)' }}>
      <Navbar />
      <main className="flex-1 md:pt-20">{children}</main>
      {!noFooter && <Footer />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/login"    element={<GuestRoute><PublicLayout noFooter><Login /></PublicLayout></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><PublicLayout noFooter><Register /></PublicLayout></GuestRoute>} />
        <Route path="/cars/:id" element={<PublicLayout><CarDetail /></PublicLayout>} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<AnalyticsPage />} />

          <Route path="/japanese-auctions"      element={<JapaneseAuctions />} />
          <Route path="/japanese-auctions/:pid" element={<JapaneseCarDetail />} />
          <Route path="/parts"                  element={<Parts />} />

          <Route path="/my-japan-purchases"  element={<MyJapanPurchases />} />
          <Route path="/my-bids"             element={<MyBids />} />
          <Route path="/my-purchases"        element={<MyPurchases />} />
          <Route path="/my-purchases/:id"    element={<PurchaseDetail />} />
          <Route path="/my-parts"            element={<MyParts />} />
          <Route path="/watchlist"           element={<Watchlist />} />
          <Route path="/notifications"       element={<Notifications />} />
          <Route path="/profile"             element={<Profile />} />
          <Route path="/sub-clients"         element={<SubClients />} />

          <Route path="/remittance"  element={<Remittance />} />
          <Route path="/shipments"   element={<Shipments />} />
          <Route path="/invoices"    element={<Invoices />} />
          <Route path="/accounting"  element={<Accounting />} />
        </Route>

        <Route element={<AdminRoute><Layout /></AdminRoute>}>
          <Route path="/admin"               element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/purchases"     element={<AdminJapanPurchases />} />
          <Route path="/admin/bids"          element={<AdminBids />} />
          <Route path="/admin/users"         element={<AdminUsers />} />
          <Route path="/admin/parts"         element={<AdminParts />} />
          <Route path="/admin/shipments"     element={<AdminShipments />} />
          <Route path="/admin/remittances"   element={<AdminRemittances />} />
          <Route path="/admin/invoices"      element={<AdminInvoices />} />
          <Route path="/admin/accounting"    element={<AdminAccounting />} />
          <Route path="/admin/japan-bids" element={<AdminJapanBids />} />
        </Route>

        <Route path="/auctions"              element={<Navigate to="/japanese-auctions" replace />} />
        <Route path="/admin/cars"            element={<Navigate to="/admin" replace />} />
        <Route path="/admin/japan-purchases" element={<Navigate to="/admin/purchases" replace />} />
        <Route path="*"                      element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </AuthProvider>
  )
}
