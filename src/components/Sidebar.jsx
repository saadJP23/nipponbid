import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ShoppingBag, Gavel, Ship, Receipt, Wallet,
  Package, Bell, User, LogOut, ChevronRight, Settings,
  Users, BarChart2, FileText, Banknote, Truck, Wrench,
} from 'lucide-react'

const NAV_USER = [
  { group: 'Overview',    items: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { group: 'My Activity', items: [
    { to: '/my-purchases', icon: ShoppingBag,      label: 'My Purchases' },
    { to: '/my-bids',      icon: Gavel,            label: 'My Bids' },
    { to: '/shipments',    icon: Ship,             label: 'Shipments' },
    { to: '/my-parts',     icon: Package,          label: 'Parts Orders' },
  ]},
  { group: 'Finance',     items: [
    { to: '/remittances',  icon: Banknote,          label: 'Remittances' },
    { to: '/invoices',     icon: Receipt,           label: 'Invoices' },
    { to: '/accounting',   icon: Wallet,            label: 'Accounting' },
  ]},
  { group: 'Account',     items: [
    { to: '/notifications',icon: Bell,              label: 'Notifications' },
    { to: '/profile',      icon: User,              label: 'Profile' },
  ]},
]

const NAV_ADMIN = [
  { group: 'Overview',    items: [
    { to: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { group: 'Management',  items: [
    { to: '/admin/users',        icon: Users,           label: 'Users' },
    { to: '/admin/purchases',    icon: ShoppingBag,     label: 'Purchases' },
    { to: '/admin/bids',         icon: Gavel,           label: 'Bids' },
    { to: '/admin/shipments',    icon: Truck,           label: 'Shipments' },
    { to: '/admin/parts',        icon: Wrench,          label: 'Parts' },
  ]},
  { group: 'Finance',     items: [
    { to: '/admin/remittances',  icon: Banknote,        label: 'Remittances' },
    { to: '/admin/invoices',     icon: FileText,        label: 'Invoices' },
    { to: '/admin/accounting',   icon: BarChart2,       label: 'Accounting' },
  ]},
]

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group
         ${isActive
           ? 'bg-red-light text-red'
           : 'text-grey-600 hover:bg-grey-100 hover:text-navy'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? 'text-red' : 'text-grey-400 group-hover:text-grey-600'} />
          <span>{label}</span>
          {isActive && <ChevronRight size={12} className="ml-auto text-red/60" />}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin  = user?.role === 'admin'
  const nav      = isAdmin ? NAV_ADMIN : NAV_USER

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-white border-r border-grey-200 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-grey-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <div>
            <p className="font-bold text-navy text-sm leading-none">NipponBid</p>
            <p className="text-xs text-grey-400 mt-0.5">
              {isAdmin ? 'Admin Panel' : 'Client Portal'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-5">
        {nav.map(group => (
          <div key={group.group}>
            <p className="px-3 mb-1.5 text-[10px] font-bold text-grey-400 uppercase tracking-widest">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-grey-200 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md">
          <div className="w-7 h-7 rounded-full bg-red flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy truncate">{user?.name}</p>
            <p className="text-xs text-grey-400 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="btn-icon flex-shrink-0" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
