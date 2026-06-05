import { Outlet, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import { useEffect, useState } from 'react'
import api from '../services/api'

const PAGE_TITLES = {
  '/dashboard':         'Dashboard',
  '/my-purchases':      'My Purchases',
  '/my-bids':           'My Bids',
  '/shipments':         'Shipments',
  '/my-parts':          'Parts Orders',
  '/remittances':       'Remittances',
  '/invoices':          'Invoices',
  '/accounting':        'Accounting',
  '/notifications':     'Notifications',
  '/profile':           'Profile',
  '/admin/users':       'Users',
  '/admin/purchases':   'Purchases',
  '/admin/bids':        'Bids',
  '/admin/shipments':   'Shipments',
  '/admin/parts':       'Parts Orders',
  '/admin/remittances': 'Remittances',
  '/admin/invoices':    'Invoices',
  '/admin/accounting':  'Accounting',
}

export default function Layout() {
  const { pathname } = useLocation()
  const { user }     = useAuth()
  const [unread, setUnread] = useState(0)
  const title = PAGE_TITLES[pathname] || 'NipponBid'

  useEffect(() => {
    api.get('/notifications?limit=1')
      .then(r => setUnread(r.data?.unread || 0))
      .catch(() => {})
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />

      <div className="flex-1 ml-[240px] flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-[56px] bg-white border-b border-grey-200 flex items-center justify-between px-6 flex-shrink-0 z-20">
          <h1 className="font-bold text-navy text-base">{title}</h1>
          <div className="flex items-center gap-2">
            <a href="/notifications" className="btn-icon relative">
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red rounded-full" />
              )}
            </a>
            <div className="w-7 h-7 rounded-full bg-red flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
