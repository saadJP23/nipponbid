import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',  icon: 'dashboard',    label: 'Dashboard' },
      { to: '/analytics',  icon: 'bar_chart',    label: 'Analytics' },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { to: '/japanese-auctions', icon: 'gavel',            label: 'Auctions' },
      { to: '/parts',             icon: 'settings_input_component', label: 'Parts Store' },
    ],
  },
  {
    label: 'My Activity',
    userOnly: true,
    items: [
      { to: '/my-japan-purchases', icon: 'directions_car', label: 'My Purchases' },
      { to: '/my-bids',            icon: 'price_change',   label: 'My Bids' },
      { to: '/my-parts',           icon: 'inventory_2',    label: 'Parts Orders' },
      { to: '/watchlist',          icon: 'favorite',       label: 'Watchlist' },
    ],
  },
  {
    label: 'Finance',
    userOnly: true,
    items: [
      { to: '/remittance',  icon: 'account_balance', label: 'Remittance' },
      { to: '/shipments',   icon: 'local_shipping',  label: 'Shipments' },
      { to: '/invoices',    icon: 'receipt_long',    label: 'Invoices' },
      { to: '/accounting',  icon: 'calculate',       label: 'Accounting' },
    ],
  },
]

const ADMIN_ITEMS = [
  { to: '/admin/purchases',     icon: 'shopping_bag',         label: 'All Purchases' },
  { to: '/admin/bids',          icon: 'gavel',                label: 'All Bids' },
  { to: '/admin/users',         icon: 'group',                label: 'Users' },
  { to: '/admin/parts',         icon: 'build',                label: 'Parts Admin' },
  { to: '/admin/shipments',     icon: 'local_shipping',       label: 'Shipments' },
  { to: '/admin/remittances',   icon: 'payments',             label: 'Remittances' },
  { to: '/admin/invoices',      icon: 'receipt_long',         label: 'Invoices' },
  { to: '/admin/accounting',    icon: 'account_balance',      label: 'Accounting' },
]

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-[10px] text-[13px] font-medium transition-all duration-150 nav-link ${
          isActive
            ? 'nav-link-active text-white'
            : 'text-white/55 hover:bg-white/5 hover:text-white/90'
        }`
      }
    >
      <span className="material-symbols-outlined text-[18px] flex-shrink-0">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const pageTitle = (() => {
    const path = location.pathname
    for (const sec of NAV_SECTIONS) {
      const match = sec.items.find(i => path.startsWith(i.to))
      if (match) return match.label
    }
    if (path.startsWith('/admin')) return 'Admin Panel'
    if (path.startsWith('/profile')) return 'Profile'
    if (path.startsWith('/notifications')) return 'Notifications'
    if (path.startsWith('/sub-clients')) return 'Sub-Clients'
    return 'NipponBid'
  })()

  const handleLogout = () => { logout(); navigate('/login') }
  const closeSidebar = () => setSidebarOpen(false)

  const SidebarContent = () => (
    <>
      <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#b7102a' }}>
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
          </div>
          <div>
            <div className="text-white font-bold text-[14px] leading-tight">NipponBid</div>
            <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Procurement Portal</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {NAV_SECTIONS.filter(sec => !(sec.userOnly && user?.role === 'admin')).map(sec => (
          <div key={sec.label} className="mb-1">
            <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {sec.label}
            </div>
            {sec.items.map(item => (
              <NavLink key={item.to} to={item.to} onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-[10px] text-[13px] font-medium transition-all duration-150 nav-link ${
                    isActive ? 'nav-link-active text-white' : 'text-white/55 hover:bg-white/5 hover:text-white/90'
                  }`
                }>
                <span className="material-symbols-outlined text-[18px] flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
        {user?.role === 'admin' && (
          <div className="mt-2 mb-1">
            <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>Admin</div>
            {ADMIN_ITEMS.map(item => (
              <NavLink key={item.to} to={item.to} onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-[10px] text-[13px] font-medium transition-all duration-150 nav-link ${
                    isActive ? 'nav-link-active text-white' : 'text-white/55 hover:bg-white/5 hover:text-white/90'
                  }`
                }>
                <span className="material-symbols-outlined text-[18px] flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <NavLink to="/profile" onClick={closeSidebar} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: '#b7102a' }}>{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-[13px] font-medium truncate leading-tight">{user?.name ?? 'Account'}</div>
            <div className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>
              {user?.role === 'admin' ? 'Administrator' : user?.email ?? ''}
            </div>
          </div>
        </NavLink>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/5"
          style={{ color: 'rgba(255,255,255,0.45)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--ae-canvas)' }}>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[240px] flex-col z-50"
        style={{ background: '#0F1729', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSidebar} />
          <aside className="relative w-[260px] flex flex-col h-full z-10"
            style={{ background: '#0F1729', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="md:ml-[240px] flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 h-[56px] flex items-center justify-between px-4 md:px-6"
          style={{
            background: 'rgba(15,23,41,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.7)' }}>
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <h1 className="text-white font-semibold text-[15px]">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <NavLink to="/notifications"
              className="relative p-1.5 rounded-lg transition-colors hover:bg-white/8"
              style={{ color: 'rgba(255,255,255,0.55)' }}>
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </NavLink>
            <NavLink to="/profile">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#b7102a' }}>
                {initials}
              </div>
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
