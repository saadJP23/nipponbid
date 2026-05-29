import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, User } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t mt-auto" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#000' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 mb-5">
              <img src="/logo.svg" alt="NipponBid" className="h-10 w-auto object-contain" />
            </Link>
            <p className="text-sm font-light leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Japan's premier car auction sourcing and export platform. We connect you directly to thousands of vehicles from Japan's top auction houses, shipped worldwide.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {['Yahoo Auctions', 'Mercari', 'USS', 'JAA', 'HAA'].map(p => (
                <span key={p} className="liquid-glass text-xs px-3 py-1.5 rounded-full" style={{ color: 'rgba(255,255,255,0.40)', borderRadius: '9999px' }}>{p}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.30)' }}>Platform</h4>
            <ul className="space-y-3">
              {[
                { to: '/auctions', label: 'Browse Auctions' },
                { to: '/parts',    label: 'Order Parts' },
                { to: '/register', label: 'Create Account' },
                { to: '/login',    label: 'Sign In' },
              ].map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm font-light transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}
                    onMouseEnter={e => e.target.style.color = '#fff'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.30)' }}>Contact</h4>
            <ul className="space-y-3.5">
              <li className="flex items-start gap-2.5 text-sm font-light" style={{ color: 'rgba(255,255,255,0.50)' }}>
                <User size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--ae-red)' }} />
                Syed Hussam Ur Rehman
              </li>
              <li className="flex items-start gap-2.5 text-sm font-light" style={{ color: 'rgba(255,255,255,0.40)' }}>
                <MapPin size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--ae-red)' }} />
                <span>Kanagawa ken, Atsugi shi<br />Sanda 3-4-32, 101<br />Japan</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm font-light">
                <Phone size={13} className="shrink-0" style={{ color: 'var(--ae-red)' }} />
                <a href="tel:09054168228" style={{ color: 'rgba(255,255,255,0.45)' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>
                  090-5416-8228
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-sm font-light">
                <Mail size={13} className="shrink-0" style={{ color: 'var(--ae-red)' }} />
                <a href="mailto:info.nipponbid@gmail.com" style={{ color: 'rgba(255,255,255,0.45)' }}
                  onMouseEnter={e => e.target.style.color = '#fff'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>
                  info.nipponbid@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} NipponBid — Syed Hussam Ur Rehman. All rights reserved.
          </p>
          <div className="flex gap-5">
            <span className="text-xs font-light cursor-pointer transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}>Privacy Policy</span>
            <span className="text-xs font-light cursor-pointer transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
