import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Car, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getCars, getAuctions, addToWatchlist, removeFromWatchlist } from '../services/api';
import CarCard from '../components/CarCard';
import { SkeletonCard } from '../components/LoadingSpinner';
import CountdownTimer from '../components/CountdownTimer';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TRANSMISSIONS = ['automatic', 'manual', 'cvt'];
const FUEL_TYPES = ['petrol', 'diesel', 'hybrid', 'electric'];

export default function Auctions() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cars, setCars] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [watchlist, setWatchlist] = useState(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    make: searchParams.get('make') || '',
    auction_id: searchParams.get('auction_id') || '',
    transmission: '',
    fuel_type: '',
    year_min: '',
    year_max: '',
    price_min: '',
    price_max: '',
    page: parseInt(searchParams.get('page') || '1'),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== 0));
      params.limit = 12;
      const { data } = await getCars(params);
      setCars(data.cars || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getAuctions({ status: 'upcoming' }).then(r => setAuctions(r.data)).catch(() => {}); }, []);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value, page: 1 }));
  const clearFilters = () => setFilters(f => ({ search: '', make: '', auction_id: '', transmission: '', fuel_type: '', year_min: '', year_max: '', price_min: '', price_max: '', page: 1 }));

  const handleWatchlist = async (carId) => {
    if (!user) return toast.error('Sign in to add to watchlist');
    if (watchlist.has(carId)) {
      await removeFromWatchlist(carId);
      setWatchlist(s => { const n = new Set(s); n.delete(carId); return n; });
      toast.success('Removed from watchlist');
    } else {
      await addToWatchlist(carId);
      setWatchlist(s => new Set([...s, carId]));
      toast.success('Added to watchlist');
    }
  };

  const activeFilterCount = [filters.make, filters.auction_id, filters.transmission, filters.fuel_type, filters.year_min, filters.year_max, filters.price_min, filters.price_max].filter(Boolean).length;

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Browse Auctions</h1>
        <p className="text-gray-500">{total.toLocaleString()} vehicles available</p>
      </div>

      {auctions.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setFilter('auction_id', '')}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${!filters.auction_id ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'}`}
          >
            All Auctions
          </button>
          {auctions.map(a => (
            <button
              key={a.id}
              onClick={() => setFilter('auction_id', String(a.id))}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${filters.auction_id === String(a.id) ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'}`}
            >
              {a.auction_house}
              <CountdownTimer targetDate={a.auction_date} />
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search make, model, chassis..."
            className="input-field pl-10"
          />
          {filters.search && (
            <button onClick={() => setFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${filtersOpen || activeFilterCount > 0 ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'}`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && <span className="w-5 h-5 rounded-full bg-gold-500 text-dark-50 text-xs flex items-center justify-center font-bold">{activeFilterCount}</span>}
        </button>
      </div>

      {filtersOpen && (
        <div className="card p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Make</label>
              <input type="text" value={filters.make} onChange={(e) => setFilter('make', e.target.value)} placeholder="Toyota, Honda..." className="input-field" />
            </div>
            <div>
              <label className="label">Transmission</label>
              <select value={filters.transmission} onChange={(e) => setFilter('transmission', e.target.value)} className="select-field">
                <option value="">Any</option>
                {TRANSMISSIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fuel Type</label>
              <select value={filters.fuel_type} onChange={(e) => setFilter('fuel_type', e.target.value)} className="select-field">
                <option value="">Any</option>
                {FUEL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year From</label>
              <input type="number" value={filters.year_min} onChange={(e) => setFilter('year_min', e.target.value)} placeholder="2010" min="1990" max="2026" className="input-field" />
            </div>
            <div>
              <label className="label">Year To</label>
              <input type="number" value={filters.year_max} onChange={(e) => setFilter('year_max', e.target.value)} placeholder="2026" min="1990" max="2026" className="input-field" />
            </div>
            <div>
              <label className="label">Min Price (¥)</label>
              <input type="number" value={filters.price_min} onChange={(e) => setFilter('price_min', e.target.value)} placeholder="0" className="input-field" />
            </div>
            <div>
              <label className="label">Max Price (¥)</label>
              <input type="number" value={filters.price_max} onChange={(e) => setFilter('price_max', e.target.value)} placeholder="5000000" className="input-field" />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="mt-4 text-sm text-red-400 hover:text-red-300 flex items-center gap-1">
              <X size={13} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : cars.length === 0 ? (
        <div className="text-center py-20">
          <Car size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No vehicles found</p>
          <p className="text-gray-600 text-sm mt-1">Try adjusting your filters</p>
          <button onClick={clearFilters} className="btn-outline-gold mt-4">Clear Filters</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {cars.map(car => (
              <CarCard
                key={car.id}
                car={car}
                onWatchlist={user ? handleWatchlist : null}
                isWatching={watchlist.has(car.id)}
              />
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="btn-ghost disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                const p = filters.page <= 4 ? i + 1 : i + filters.page - 3;
                if (p > pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setFilters(f => ({ ...f, page: p }))}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === filters.page ? 'bg-gold-500 text-dark-50' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={filters.page >= pages}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="btn-ghost disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
