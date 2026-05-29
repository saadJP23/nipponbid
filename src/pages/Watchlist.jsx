import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { getWatchlist, removeFromWatchlist } from '../services/api';
import CarCard from '../components/CarCard';
import toast from 'react-hot-toast';

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWatchlist().then(r => setItems(r.data)).finally(() => setLoading(false));
  }, []);

  const handleRemove = async (carId) => {
    await removeFromWatchlist(carId);
    setItems(prev => prev.filter(i => i.id !== carId));
    toast.success('Removed from watchlist');
  };

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }} className="page-container">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ae-ink)' }}><Heart size={22} style={{ color: 'var(--ae-red)' }} /> Watchlist</h1>
        <p className="text-gray-500 mt-1">{items.length} saved vehicle{items.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-20">
          <Heart size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Your watchlist is empty</p>
          <p className="text-gray-600 text-sm mt-1">Browse auctions and save cars you're interested in</p>
          <Link to="/auctions" className="btn-gold mt-5">Browse Cars</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map(car => (
            <div key={car.id} className="relative group">
              <CarCard car={car} />
              <button
                onClick={() => handleRemove(car.id)}
                className="absolute top-3 right-3 p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 opacity-0 group-hover:opacity-100 transition-all z-10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
