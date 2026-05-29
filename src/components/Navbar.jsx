import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Car, Bell, LogOut, ChevronDown, Menu, X,
  LayoutDashboard, Gavel, ShoppingBag, Wrench, Heart,
  Settings, Shield, Users, Package, DollarSign,
  Ship, Receipt, BookOpen, UserPlus, ArrowUpRight,
  Sun, Moon,
} from 'lucide-react';
import { getNotifications } from '../services/api';

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('ae-theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ae-theme', theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [unread, setUnread]   = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const userRef  = useRef(null);
  const adminRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    if (user) getNotifications({ limit: 1 }).then(r => setUnread(r.data?.unread || 0)).catch(() => {});
  }, [user]);

  useEffect(() => {
    const h = (e) => {
      if (userRef.current  && !userRef.current.contains(e.target))  setUserMenuOpen(false);
      if (adminRef.current && !adminRef.current.contains(e.target)) setAdminMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); setMobileOpen(false); };

  const userLinks = [
    { to: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/my-bids',            icon: Gavel,           label: 'My Bids' },
    { to: '/my-purchases',       icon: ShoppingBag,     label: 'My Purchases' },
    { to: '/my-japan-purchases', icon: Car,             label: 'Japan Purchases' },
    { to: '/my-parts',           icon: Wrench,          label: 'My Parts' },
    { to: '/shipments',          icon: Ship,            label: 'My Shipments' },
    { to: '/remittance',         icon: DollarSign,      label: 'Remittance' },
    { to: '/invoices',           icon: Receipt,         label: 'Invoices' },
    { to: '/accounting',         icon: BookOpen,        label: 'Ledger' },
    { to: '/sub-clients',        icon: UserPlus,        label: 'Sub-Clients' },
    { to: '/watchlist',          icon: Heart,           label: 'Watchlist' },
    { to: '/profile',            icon: Settings,        label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/bids',         icon: Gavel,           label: 'Bids' },
    { to: '/admin/purchases',    icon: ShoppingBag,     label: 'Purchases' },
    { to: '/admin/parts',               icon: Package,         label: 'Parts' },
    { to: '/admin/shipments',           icon: Ship,            label: 'Shipments' },
    { to: '/admin/remittances',         icon: DollarSign,      label: 'Remittances' },
    { to: '/admin/invoices',            icon: Receipt,         label: 'Invoices' },
    { to: '/admin/accounting',          icon: BookOpen,        label: 'Accounting' },
    { to: '/admin/users',               icon: Users,           label: 'Users' },
  ];

  const dropdownCard = { borderRadius: '1rem', background: 'var(--ae-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' };

  return (
    <>
      <nav className={`hidden md:block fixed left-0 right-0 z-50 px-6 lg:px-12 transition-all duration-300 pointer-events-none ${scrolled ? 'top-2' : 'top-4'}`}>
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto pointer-events-auto">

          <Link to="/" className="liquid-glass flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full shrink-0 hover:bg-white/8 transition-colors">
            <img src="/logo.svg" alt="NipponBid" className="h-9 w-9 object-contain rounded-full" />
            <span style={{ fontFamily: 'var(--ae-font-heading)', fontStyle: 'italic', fontSize: '1.1rem', letterSpacing: '-0.5px', color: 'var(--ae-ink)' }}>NipponBid</span>
          </Link>

          <div className="liquid-glass flex items-center rounded-full" style={{ padding: '5px 5px' }}>
            <NavLink to="/" end className={({ isActive }) =>
              `px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/6'}`
            }>Home</NavLink>
            <NavLink to="/japanese-auctions" className={({ isActive }) =>
              `px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/6'}`
            }>Auctions</NavLink>
            {user && (
              <>
                <NavLink to="/parts" className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/6'}`
                }>Parts</NavLink>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button onClick={toggleTheme}
                  className="liquid-glass w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                <Link to="/notifications" className="liquid-glass relative w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors">
                  <Bell size={16} />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ background: 'var(--ae-red)', fontSize: '9px' }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>

                {isAdmin && (
                  <div ref={adminRef} className="relative">
                    <button onClick={() => setAdminMenuOpen(o => !o)}
                      className="liquid-glass flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-purple-300 hover:text-purple-200 transition-colors">
                      <Shield size={13} /> Admin
                      <ChevronDown size={12} className={`transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {adminMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 card py-1.5 z-50 shadow-card" style={dropdownCard}>
                        <div className="px-4 py-3 border-b border-white/5">
                          <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                          <p className="text-white/35 text-xs truncate">{user.email}</p>
                        </div>
                        {adminLinks.map(l => (
                          <Link key={l.to} to={l.to} onClick={() => setAdminMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                            <l.icon size={14} className="opacity-40" /> {l.label}
                          </Link>
                        ))}
                        <div className="border-t border-white/5 mt-1">
                          <button onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors">
                            <LogOut size={14} /> Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isAdmin && (
                  <div ref={userRef} className="relative">
                    <button onClick={() => setUserMenuOpen(o => !o)}
                      className="liquid-glass flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-white/8 transition-colors">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ background: 'var(--ae-red)' }}>
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm text-white/80 font-medium max-w-20 truncate">{user.name?.split(' ')[0]}</span>
                      <ChevronDown size={12} className={`text-white/40 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 card py-1.5 z-50 shadow-card" style={dropdownCard}>
                        <div className="px-4 py-3 border-b border-white/5">
                          <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                          <p className="text-white/35 text-xs truncate">{user.email}</p>
                        </div>
                        {userLinks.map(l => (
                          <Link key={l.to} to={l.to} onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                            <l.icon size={14} className="opacity-40" /> {l.label}
                          </Link>
                        ))}
                        <div className="border-t border-white/5 mt-1">
                          <button onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors">
                            <LogOut size={14} /> Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="liquid-glass flex items-center gap-1 rounded-full" style={{ padding: '5px 5px' }}>
                <Link to="/login" className="px-4 py-2 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/6 transition-all">
                  Sign In
                </Link>
                <Link to="/register" className="btn-gold !py-2 !px-4 text-xs">
                  Get Started <ArrowUpRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <nav className="md:hidden sticky top-0 z-40" style={{ background: 'var(--ae-canvas)', borderBottom: '1px solid var(--ae-glass-border)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="NipponBid" className="h-8 w-auto object-contain" />
          </Link>
          <button onClick={() => setMobileOpen(o => !o)} className="text-white/60 hover:text-white p-2">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/5 px-4 py-4 space-y-1" style={{ background: 'var(--ae-canvas)' }}>
            <Link to="/"                   onClick={() => setMobileOpen(false)} className="block py-2.5 text-white/60 hover:text-white text-sm font-medium">Home</Link>
            <Link to="/japanese-auctions"  onClick={() => setMobileOpen(false)} className="block py-2.5 text-white/60 hover:text-white text-sm font-medium">Auctions</Link>
            {user && (
              <>
                <Link to="/parts"        onClick={() => setMobileOpen(false)} className="block py-2.5 text-white/60 hover:text-white text-sm font-medium">Order Parts</Link>
                <div className="border-t border-white/5 pt-3 mt-3 space-y-1">
                  {userLinks.map(l => (
                    <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 py-2.5 text-white/50 hover:text-white text-sm">
                      <l.icon size={14} /> {l.label}
                    </Link>
                  ))}
                  {isAdmin && adminLinks.map(l => (
                    <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 py-2.5 text-purple-300 hover:text-purple-200 text-sm">
                      <l.icon size={14} /> {l.label}
                    </Link>
                  ))}
                  <button onClick={handleLogout} className="flex items-center gap-3 py-2.5 text-red-400 text-sm w-full">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </>
            )}
            {!user && (
              <div className="flex gap-3 pt-3 border-t border-white/5">
                <Link to="/login"    onClick={() => setMobileOpen(false)} className="btn-outline-gold flex-1 justify-center">Sign In</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-gold flex-1 justify-center">Register</Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
