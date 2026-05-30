import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Car, Globe, Shield, Gavel, Clock, Users, ChevronRight, Lock, Calendar, Flag } from 'lucide-react';
import { getAuctions, getCars, getJapanFeatured, resolveImageUrl } from '../services/api';
import CarCard from '../components/CarCard';
import CountdownTimer from '../components/CountdownTimer';

const STAT_ITEMS = [
  { label: 'Cars Exported',   value: '12,400+', icon: Car },
  { label: 'Countries',       value: '45+',     icon: Globe },
  { label: 'Auction Houses',  value: '50+',     icon: Gavel },
  { label: 'Happy Clients',   value: '3,200+',  icon: Users },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Browse Auctions',  desc: 'Explore thousands of vehicles from Japan\'s top auction houses, updated in real time.' },
  { step: '02', title: 'Place Bid Request', desc: 'Submit your desired bid price. Our expert team represents you at the auction.' },
  { step: '03', title: 'Win & Export',     desc: 'On winning, we handle all paperwork, inspection, and worldwide shipping.' },
];

const AUCTION_HOUSES = ['USS', 'JAA', 'HAA', 'JU', 'TAA', 'CAA', 'BAYAUC', 'HERO', 'AUCNET'];

export default function Home() {
  const [auctions,       setAuctions]       = useState([]);
  const [featuredCars,   setFeaturedCars]   = useState([]);
  const [japanStock,     setJapanStock]     = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    Promise.all([
      getAuctions({ status: 'upcoming' }),
      getCars({ status: 'upcoming', limit: 8, page: 1 }),
      getJapanFeatured(),
    ]).then(([aRes, cRes, jRes]) => {
      setAuctions(Array.isArray(aRes.data) ? aRes.data.slice(0, 5) : []);
      setFeaturedCars(Array.isArray(cRes.data?.cars) ? cRes.data.cars : []);
      setJapanStock(Array.isArray(jRes.data) ? jRes.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100dvh' }}>
      <section className="ae-hero relative min-h-screen flex flex-col overflow-hidden pt-20 md:pt-0" style={{ background: 'var(--ae-canvas)' }}>

        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/hero-bg.jpeg"
            alt=""
            className="ae-kenburns absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.30) 40%, rgba(0,0,0,0.75) 80%, var(--ae-canvas) 100%)'
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 80%, rgba(225,29,44,0.08) 0%, transparent 70%)'
          }} />
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-32">

          <div className="liquid-glass inline-flex items-center gap-2 rounded-full mb-8 ae-blur-in"
            style={{ padding: '4px 14px 4px 4px', animationDelay: '0.3s', opacity: 0 }}>
            <span className="text-xs font-semibold text-white rounded-full px-3 py-1"
              style={{ background: 'var(--ae-red)' }}>
              Live
            </span>
            <span className="text-sm text-white/85 font-body">Japan's #1 Car Auction Platform</span>
          </div>

          <h1 className="ae-blur-in mb-6 text-white"
            style={{
              fontFamily: 'var(--ae-font-heading)',
              fontWeight: 800,
              fontSize: 'clamp(3.2rem, 9vw, 6.5rem)',
              lineHeight: 0.88,
              letterSpacing: '-3px',
              animationDelay: '0.5s',
              opacity: 0,
            }}>
            Source Any Car<br />
            <span style={{ color: 'var(--ae-red)' }}>From Japan</span>
          </h1>

          <p className="ae-blur-in text-white/70 max-w-xl font-light mb-10 leading-snug"
            style={{ fontSize: '1rem', animationDelay: '0.75s', opacity: 0 }}>
            Access 50+ Japanese auction houses, place bids on thousands of vehicles, and have them shipped directly to your door — anywhere in the world.
          </p>

          <div className="ae-blur-in flex flex-wrap items-center justify-center gap-4 mb-14"
            style={{ animationDelay: '1s', opacity: 0 }}>
            <Link to="/japanese-auctions" className="btn-gold text-sm px-6 py-3">
              Browse Auctions <ArrowUpRight size={16} />
            </Link>
            <Link to="/register" className="btn-outline-gold text-sm px-6 py-3">
              Start For Free
            </Link>
          </div>

          <div className="ae-blur-in flex flex-wrap justify-center gap-4"
            style={{ animationDelay: '1.2s', opacity: 0 }}>
            {STAT_ITEMS.map(({ label, value, icon: Icon }) => (
              <div key={label} className="liquid-glass text-left"
                style={{ width: 160, borderRadius: '1.25rem', padding: '18px 20px' }}>
                <Icon size={22} className="text-white/60 mb-3" strokeWidth={1.5} />
                <div style={{ fontFamily: 'var(--ae-font-heading)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1, letterSpacing: '-1px', color: '#fff' }}>
                  {value}
                </div>
                <div className="text-white/50 text-xs mt-1.5 font-light">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center pb-12 px-4 ae-blur-in"
          style={{ animationDelay: '1.4s', opacity: 0 }}>
          <div className="liquid-glass rounded-full px-4 py-1.5 text-xs font-medium text-white/60 mb-5" style={{ borderRadius: '9999px' }}>
            Partnered with Japan's top auction houses
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {AUCTION_HOUSES.map(h => (
              <span key={h} style={{ fontFamily: 'var(--ae-font-heading)', fontWeight: 700, fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', letterSpacing: '-0.5px', color: 'rgba(255,255,255,0.80)' }}>
                {h}
              </span>
            ))}
          </div>
        </div>
      </section>

      {auctions.length > 0 && (
        <section className="py-20 px-4" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(225,29,44,0.05) 0%, transparent 60%)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--ae-red)' }}>Live Schedule</p>
                <h2 className="section-title">Upcoming Auctions</h2>
              </div>
              <Link to="/japanese-auctions" className="btn-ghost hidden sm:flex text-xs">
                View All <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {auctions.map((auction) => (
                <Link key={auction.id} to={`/japanese-auctions?auction_id=${auction.id}`} className="card-hover p-5 block">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-sm" style={{ color: 'var(--ae-ink)' }}>{auction.name}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ae-ink-muted)' }}>{auction.location}</p>
                    </div>
                    <span className="badge-blue text-xs">{auction.auction_house}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5" style={{ color: 'var(--ae-ink-muted)' }}>
                      <Car size={12} />{auction.car_count || 0} vehicles
                    </div>
                    <CountdownTimer targetDate={auction.auction_date} />
                  </div>
                  <div className="mt-3 pt-3 text-xs" style={{ borderTop: '1px solid var(--ae-glass-border)', color: 'var(--ae-ink-faint)' }}>
                    {new Date(auction.auction_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 sm:hidden">
              <Link to="/japanese-auctions" className="btn-outline-gold w-full justify-center">View All Auctions</Link>
            </div>
          </div>
        </section>
      )}

      {featuredCars.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--ae-red)' }}>Hot Listings</p>
                <h2 className="section-title">Featured Vehicles</h2>
              </div>
              <Link to="/japanese-auctions" className="btn-ghost hidden sm:flex text-xs">
                Browse All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {featuredCars.map(car => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 px-4 overflow-hidden" style={{ background: 'radial-gradient(ellipse 100% 60% at 50% 50%, rgba(225,29,44,0.04) 0%, transparent 70%)' }}>
        <div className="max-w-7xl mx-auto">

          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--ae-red)' }}>Live from Japan</p>
                <span className="inline-flex items-center gap-1 liquid-glass rounded-full px-2.5 py-0.5 text-xs font-semibold text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Updated Daily
                </span>
              </div>
              <h2 className="section-title">Upcoming Japan Auctions</h2>
              <p className="text-sm mt-2 font-light max-w-md" style={{ color: 'var(--ae-ink-muted)' }}>
                Fresh stock from USS, HAA, JU &amp; 50+ auction houses — scraped daily and ready to bid.
              </p>
            </div>
            <Link to="/japanese-auctions" className="btn-ghost hidden sm:flex text-xs shrink-0">
              View All <ChevronRight size={14} />
            </Link>
          </div>

          {japanStock.length > 0 ? (
            <div className="relative">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {japanStock.map((car, i) => {
                  const isBlurred = i >= 8;
                  const dateLabel = car.auction_date
                    ? new Date(car.auction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : null;
                  return (
                    <div key={car.pid} className="relative group" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                      <div className={`card h-full flex flex-col transition-transform duration-300 ${!isBlurred ? 'group-hover:-translate-y-1' : ''}`}
                        style={{ borderRadius: '1rem', padding: 0 }}>
                        <div className="relative aspect-[4/3] overflow-hidden" style={{ borderRadius: '1rem 1rem 0 0' }}>
                          {car.image_url ? (
                            <img
                              src={resolveImageUrl(car.image_url)}
                              alt={`${car.make} ${car.model}`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              style={{ filter: isBlurred ? 'blur(6px) brightness(0.4)' : undefined }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--ae-glass-bg)' }}>
                              <Car size={24} className="text-white/15" />
                            </div>
                          )}
                          {car.auction_house && !isBlurred && (
                            <span className="absolute top-2 left-2 liquid-glass rounded-full px-2 py-0.5 text-xs font-medium text-white/80"
                              style={{ fontSize: '10px' }}>
                              {car.auction_house.split(' ')[0]}
                            </span>
                          )}
                          {dateLabel && !isBlurred && (
                            <span className="absolute top-2 right-2 liquid-glass rounded-full px-2 py-0.5 text-xs font-medium text-white/80 flex items-center gap-1"
                              style={{ fontSize: '10px' }}>
                              <Calendar size={9} />{dateLabel}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 p-3" style={{ filter: isBlurred ? 'blur(4px)' : undefined }}>
                          <p className="font-medium leading-tight text-xs truncate" style={{ color: 'var(--ae-ink)' }}>{car.make}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--ae-ink-muted)' }}>{car.model || '—'}</p>
                          {car.year && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--ae-ink-faint)' }}>{car.year}</p>
                          )}
                        </div>
                      </div>

                      {isBlurred && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center" style={{ borderRadius: '1rem' }}>
                          <div className="liquid-glass w-8 h-8 rounded-full flex items-center justify-center">
                            <Lock size={14} className="text-white/70" />
                          </div>
                          <p className="text-white/60 text-xs leading-tight font-medium">Login to see all cars</p>
                          <Link to="/login" className="btn-gold !py-1 !px-3 text-xs mt-1" style={{ fontSize: '11px' }}>
                            Sign In
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/japanese-auctions" className="btn-gold px-6 py-2.5 text-sm">
                  Browse All Japan Auction Stock <ArrowUpRight size={15} />
                </Link>
                <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>
                  {japanStock.length}+ vehicles shown · thousands more after login
                </p>
              </div>
            </div>
          ) : (
            
            <div className="card p-12 text-center">
              <Flag size={32} className="mx-auto mb-4" style={{ color: 'var(--ae-ink-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Japan auction data syncs twice daily — check back soon.</p>
              <Link to="/register" className="btn-gold px-6 py-2.5 text-sm mt-6 inline-flex">
                Register to Get Notified <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: 'var(--ae-red)' }}>Simple Process</p>
            <h2 className="section-title">How NipponBid Works</h2>
            <p className="mt-4 max-w-lg mx-auto text-sm font-light" style={{ color: 'var(--ae-ink-muted)' }}>
              From browsing to delivery — we handle everything so you can focus on getting the right car.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="card p-7 relative">
                <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-xl"
                  style={{ background: 'rgba(225,29,44,0.10)', boxShadow: 'inset 0 0 0 1px rgba(225,29,44,0.20)' }}>
                  <span style={{ fontFamily: 'var(--ae-font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ae-red)' }}>{step}</span>
                </div>
                <h3 style={{ fontFamily: 'var(--ae-font-heading)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.5px', color: 'var(--ae-ink)', lineHeight: 1 }}>{title}</h3>
                <p className="text-sm mt-3 leading-relaxed font-light" style={{ color: 'var(--ae-ink-muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(225,29,44,0.08) 0%, transparent 70%)'
            }} />
            <div className="relative">
              <h2 style={{ fontFamily: 'var(--ae-font-heading)', fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-2px', color: 'var(--ae-ink)', lineHeight: 0.95 }}>
                Ready to Source<br />Your Dream Car?
              </h2>
              <p className="mt-5 max-w-md mx-auto text-sm font-light leading-relaxed" style={{ color: 'var(--ae-ink-muted)' }}>
                Join thousands of importers who trust NipponBid to source and deliver premium Japanese vehicles worldwide.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <Link to="/register" className="btn-gold px-7 py-3">
                  Create Free Account <ArrowUpRight size={16} />
                </Link>
                <Link to="/japanese-auctions" className="btn-outline-gold px-7 py-3">
                  Browse Auctions
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
