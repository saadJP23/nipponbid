import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Filter, ChevronLeft, ChevronRight,
  Car, Calendar, Gauge, Zap, Star, FileText, X,
} from 'lucide-react';
import { getJapanCars, getJapanMakes, getJapanStats, getJapanDates } from '../services/api';

const AUCTION_HOUSES = ['USS', 'HAA', 'JAA', 'JU', 'TAA', 'CAA', 'BAYAUC', 'HERO'];
const GRADES  = ['5', '4.5', '4', '3.5', '3', 'R', 'RA'];
const YEARS   = Array.from({ length: 26 }, (_, i) => 2025 - i);

const toNum = (v, fallback = '') => v ? String(v) : fallback;

function AuctionCarCard({ car, onSheet }) {
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();
  const grade = car.auction_grade;

  const gradeColor =
    parseFloat(grade) >= 4.5 ? 'text-emerald-500' :
    parseFloat(grade) >= 3.5 ? 'text-yellow-500'  :
    parseFloat(grade) >= 3   ? 'text-orange-500'  : 'text-gray-400';

  return (
    <div
      className="card flex flex-col overflow-hidden group transition-all duration-250 hover:translate-y-[-2px] cursor-pointer"
      style={{ boxShadow: 'inset 0 0 0 1px var(--ae-glass-border)' }}
      onClick={() => navigate(`/japanese-auctions/${car.pid}`)}>

      <div className="relative overflow-hidden" style={{ aspectRatio: '16/10', background: 'var(--ae-glass-bg)' }}>
        {car.image_url && !imgError ? (
          <img
            src={car.image_url?.startsWith('/') ? car.image_url : `${car.image_url}&w=480`}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car size={40} style={{ color: 'var(--ae-ink-faint)' }} />
          </div>
        )}

        {grade && (
          <div className="absolute top-2.5 left-2.5 liquid-glass rounded-full px-2.5 py-0.5 flex items-center gap-1">
            <Star size={10} className={gradeColor} />
            <span className={`text-xs font-semibold ${gradeColor}`}>{grade}</span>
          </div>
        )}

        {car.auction_house && (
          <div className="absolute top-2.5 right-2.5 badge-blue text-[10px] px-2 py-0.5">
            {car.auction_house.split(' ')[0]}
          </div>
        )}

        {car.sheet_url && (
          <button
            onClick={(e) => { e.stopPropagation(); onSheet(car); }}
            className="absolute bottom-2.5 right-2.5 liquid-glass rounded-full p-1.5 text-white/70
                       hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            title="View Auction Sheet">
            <FileText size={13} />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col p-4">
        <h3 style={{ fontFamily: 'var(--ae-font-heading)', fontStyle: 'italic', fontSize: '1.1rem', lineHeight: 1, letterSpacing: '-0.5px', color: 'var(--ae-ink)' }}
          className="mb-2">
          {car.make} <span style={{ color: 'var(--ae-ink-muted)' }}>{car.model}</span>
        </h3>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-3 flex-1">
          {car.year && (
            <div className="flex items-center gap-1.5" style={{ color: 'var(--ae-ink-muted)' }}>
              <Calendar size={11} className="flex-shrink-0" />
              <span>{car.year}</span>
            </div>
          )}
          {car.mileage != null && (
            <div className="flex items-center gap-1.5" style={{ color: 'var(--ae-ink-muted)' }}>
              <Gauge size={11} className="flex-shrink-0" />
              <span>{car.mileage.toLocaleString()} km</span>
            </div>
          )}
          {car.cc && (
            <div className="flex items-center gap-1.5" style={{ color: 'var(--ae-ink-muted)' }}>
              <Zap size={11} className="flex-shrink-0" />
              <span>{car.cc.toLocaleString()} cc</span>
            </div>
          )}
          {car.chassis && (
            <div className="flex items-center gap-1.5 col-span-2 truncate" style={{ color: 'var(--ae-ink-muted)' }}>
              <Car size={11} className="flex-shrink-0" />
              <span className="truncate">{car.chassis}</span>
            </div>
          )}
        </div>

        <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--ae-glass-border)' }}>
          <div>
            {car.auction_date && (
              <p className="text-[10px] mb-0.5" style={{ color: 'var(--ae-ink-faint)' }}>{new Date(car.auction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            )}
            {car.lot_number && (
              <p className="text-[10px]" style={{ color: 'var(--ae-ink-muted)' }}>Lot# {car.lot_number}</p>
            )}
          </div>
          {car.start_price > 0 && (
            <div className="text-right">
              <p className="text-[10px]" style={{ color: 'var(--ae-ink-faint)' }}>Start</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ae-red)' }}>
                ¥{car.start_price.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SheetModal({ car, onClose }) {
  if (!car) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors flex items-center gap-2 text-sm">
          <X size={16} /> Close
        </button>
        <div className="card p-3">
          <p className="text-white/50 text-xs mb-2 px-1">
            Auction Sheet — {car.make} {car.model} {car.year} · Lot# {car.lot_number}
          </p>
          <img
            src={car.sheet_url}
            alt="Auction Sheet"
            className="w-full rounded-xl"
            style={{ maxHeight: '80vh', objectFit: 'contain' }}
          />
        </div>
      </div>
    </div>
  );
}

export default function JapaneseAuctions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars,    setCars]    = useState([]);
  const [makes,   setMakes]   = useState([]);
  const [stats,   setStats]   = useState(null);
  const [dates,   setDates]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [sheetCar, setSheetCar] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    make:          searchParams.get('make')          || '',
    model:         searchParams.get('model')         || '',
    year_min:      searchParams.get('year_min')      || '',
    year_max:      searchParams.get('year_max')      || '',
    auction_house: searchParams.get('auction_house') || '',
    grade:         searchParams.get('grade')         || '',
    mileage_max:   searchParams.get('mileage_max')   || '',
    lot_number:    searchParams.get('lot_number')    || '',
    auction_date:  searchParams.get('auction_date')  || '',
    page:          parseInt(searchParams.get('page') || '1', 10),
    limit:         24,
  });

  useEffect(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (k === 'limit') return;
      if (v === '' || v === null) return;
      if (k === 'page' && +v === 1) return;
      params[k] = String(v);
    });
    setSearchParams(params, { replace: true });
  }, [filters]);

  const fetchCars = useCallback(async (f) => {
    setLoading(true);
    try {
      const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
      const res = await getJapanCars(clean);
      setCars(res.data.cars || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch {
      setCars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCars(filters); }, [filters, fetchCars]);

  useEffect(() => {
    getJapanMakes().then(r => setMakes(r.data || [])).catch(() => {});
    getJapanStats().then(r => setStats(r.data)).catch(() => {});
    getJapanDates().then(r => setDates(r.data || [])).catch(() => {});
  }, []);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));
  const clearFilters = () => setFilters({ make: '', model: '', year_min: '', year_max: '', auction_house: '', grade: '', mileage_max: '', lot_number: '', auction_date: '', page: 1, limit: 24 });
  const filterKeys = ['make','model','year_min','year_max','auction_house','grade','mileage_max','lot_number'];
  const activeFilterCount = filterKeys.filter(k => filters[k] !== '').length;
  const hasFilters = activeFilterCount > 0 || !!filters.auction_date;

  return (
    <div data-theme="light" className="min-h-screen" style={{ background: 'var(--ae-canvas)' }}>

      <div className="relative py-20 px-4 text-center overflow-hidden"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(225,29,44,0.07) 0%, transparent 70%)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--ae-red)' }}>
          Live Feed
        </p>
        <h1 className="section-title mb-4">Japanese Auction Cars</h1>
        <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--ae-ink-muted)' }}>
          Real-time listings from USS, HAA, JAA and 50+ Japanese auction houses — updated nightly.
        </p>

        {stats && (
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {[
              { label: 'Cars Listed', value: parseInt(stats.total_cars || 0).toLocaleString() },
              { label: 'Makes',       value: stats.total_makes },
              { label: 'Last Sync',   value: stats.last_synced ? new Date(stats.last_synced).toLocaleDateString() : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="liquid-glass rounded-2xl px-5 py-3 text-center">
                <p style={{ fontFamily: 'var(--ae-font-heading)', fontStyle: 'italic', fontSize: '1.5rem', letterSpacing: '-1px', color: 'var(--ae-ink)' }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ae-ink-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20">

        {dates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => setFilter('auction_date', '')}
              className="px-4 py-1.5 rounded-full text-xs font-medium transition-all border"
              style={!filters.auction_date
                ? { background: 'var(--ae-red)', borderColor: 'var(--ae-red)', color: '#fff' }
                : { borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-muted)' }}>
              All Dates
            </button>
            {dates.map(({ date, count }) => {
              const d   = new Date(date + 'T00:00:00');
              const lbl = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const active = filters.auction_date === date;
              return (
                <button
                  key={date}
                  onClick={() => setFilter('auction_date', active ? '' : date)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all border"
                  style={active
                    ? { background: 'var(--ae-red)', borderColor: 'var(--ae-red)', color: '#fff' }
                    : { borderColor: 'var(--ae-glass-border)', color: 'var(--ae-ink-muted)' }}>
                  <Calendar size={11} />
                  {lbl}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ae-ink-faint)' }} />
            <input
              className="input-field pl-9 text-sm"
              placeholder="Make or model..."
              value={filters.make}
              onChange={e => setFilter('make', e.target.value)}
            />
          </div>

          <button
            onClick={() => setShowFilters(f => !f)}
            className="btn-ghost text-sm"
            style={showFilters ? { background: 'var(--ae-glass-bg)', color: 'var(--ae-ink)' } : {}}>
            <Filter size={14} /> Filters
            {activeFilterCount > 0 && (
              <span className="text-[10px] rounded-full px-1.5 py-0.5 ml-0.5 text-white" style={{ background: 'var(--ae-red)' }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost text-xs" style={{ color: 'var(--ae-ink-muted)' }}>
              <X size={12} /> Clear
            </button>
          )}

          <p className="text-xs ml-auto" style={{ color: 'var(--ae-ink-faint)' }}>{total.toLocaleString()} cars</p>
        </div>

        {showFilters && (
          <div className="card p-5 mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            <div>
              <label className="label">Auction</label>
              <select className="select-field text-xs" value={filters.auction_house} onChange={e => setFilter('auction_house', e.target.value)}>
                <option value="">All</option>
                {AUCTION_HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Make</label>
              <select className="select-field text-xs" value={filters.make} onChange={e => setFilter('make', e.target.value)}>
                <option value="">All</option>
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Model</label>
              <input className="input-field text-xs" placeholder="e.g. Prado" value={filters.model} onChange={e => setFilter('model', e.target.value)} />
            </div>

            <div>
              <label className="label">Year From</label>
              <select className="select-field text-xs" value={filters.year_min} onChange={e => setFilter('year_min', e.target.value)}>
                <option value="">Any</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Year To</label>
              <select className="select-field text-xs" value={filters.year_max} onChange={e => setFilter('year_max', e.target.value)}>
                <option value="">Any</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Min Grade</label>
              <select className="select-field text-xs" value={filters.grade} onChange={e => setFilter('grade', e.target.value)}>
                <option value="">Any</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Lot No.</label>
              <input className="input-field text-xs" placeholder="e.g. 60193" value={filters.lot_number} onChange={e => setFilter('lot_number', e.target.value)} />
            </div>

            <div>
              <label className="label">Max KM</label>
              <input className="input-field text-xs" type="number" placeholder="e.g. 50000" value={filters.mileage_max} onChange={e => setFilter('mileage_max', e.target.value)} />
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton" style={{ aspectRatio: '16/10' }} />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-5 w-3/4 rounded-lg" />
                  <div className="skeleton h-3 w-1/2 rounded-lg" />
                  <div className="skeleton h-3 w-2/3 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : cars.length === 0 ? (
          <div className="text-center py-32">
            <Car size={48} className="mx-auto mb-4" style={{ color: 'var(--ae-ink-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>
              {total === 0
                ? 'No cars in database yet — run the scraper to import listings.'
                : 'No cars match your filters.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="btn-outline-gold text-xs mt-4 px-5">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {cars.map(car => (
              <AuctionCarCard key={car.pid} car={car} onSheet={setSheetCar} />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed px-3">
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
              let p;
              if (pages <= 7) p = i + 1;
              else if (filters.page <= 4) p = i + 1;
              else if (filters.page >= pages - 3) p = pages - 6 + i;
              else p = filters.page - 3 + i;
              return (
                <button key={p}
                  onClick={() => setFilters(f => ({ ...f, page: p }))}
                  className="w-8 h-8 rounded-full text-xs font-medium transition-all"
                  style={p === filters.page
                    ? { background: 'var(--ae-red)', color: '#fff' }
                    : { color: 'var(--ae-ink-muted)' }}>
                  {p}
                </button>
              );
            })}

            <button
              disabled={filters.page >= pages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed px-3">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <SheetModal car={sheetCar} onClose={() => setSheetCar(null)} />
    </div>
  );
}
