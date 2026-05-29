import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Gauge, Calendar, Car, Fuel, Settings, Users, Heart, ArrowLeft, ChevronLeft, ChevronRight, MapPin, Hash, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { getCar, addToWatchlist, removeFromWatchlist } from '../services/api';
import { useAuth } from '../context/AuthContext';
import BidModal from '../components/BidModal';
import StatusBadge from '../components/StatusBadge';
import CountdownTimer from '../components/CountdownTimer';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AUCTION_CODES = [
  { code: 'A', desc: 'Scratch (small mark on paint)' },
  { code: 'B', desc: 'Scratch (larger than A)' },
  { code: 'C', desc: 'Scratch (very large or deep)' },
  { code: 'U', desc: 'Dent (small)' },
  { code: 'UU', desc: 'Dent (large)' },
  { code: 'W', desc: 'Wave / wavy panel (repaired)' },
  { code: 'WW', desc: 'Wave (large)' },
  { code: 'S', desc: 'Rust' },
  { code: 'SS', desc: 'Rust (severe)' },
  { code: 'X', desc: 'Panel repainted' },
  { code: 'XX', desc: 'Panel replaced' },
  { code: 'P', desc: 'Rust through hole' },
  { code: 'E1', desc: 'Windshield chip (small)' },
  { code: 'E2', desc: 'Windshield crack' },
  { code: 'E3', desc: 'Windshield crack (large)' },
  { code: 'R', desc: 'Repaired area' },
  { code: 'H', desc: 'Hail damage' },
  { code: 'Y', desc: 'Sunroof / roof crack' },
  { code: 'T', desc: 'Torn / cut (interior)' },
  { code: 'L', desc: 'Leather tear' },
  { code: 'F', desc: 'Fading paint' },
  { code: 'G', desc: 'Chip / stone damage' },
  { code: 'M', desc: 'Mold / stain' },
  { code: 'O', desc: 'Other defect' },
];

function AuctionSheetLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/2 transition-colors"
      >
        <span className="flex items-center gap-2 text-white font-semibold text-sm">
          <FileText size={15} className="text-gold-500" />
          Auction Sheet Damage Code Legend
        </span>
        {open ? <ChevronUp size={15} className="text-white/40" /> : <ChevronDown size={15} className="text-white/40" />}
      </button>
      {open && (
        <div className="border-t border-white/5 p-4 grid grid-cols-2 gap-2">
          {AUCTION_CODES.map(({ code, desc }) => (
            <div key={code} className="flex items-start gap-2 text-sm">
              <span className="text-gold-400 font-mono font-bold w-8 shrink-0">{code}</span>
              <span className="text-white/60">{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CarDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [bidOpen, setBidOpen] = useState(false);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    getCar(id)
      .then(r => { setCar(r.data); })
      .catch(() => toast.error('Failed to load car'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleWatchlist = async () => {
    if (!user) return toast.error('Sign in to add to watchlist');
    if (watching) {
      await removeFromWatchlist(id);
      setWatching(false);
      toast.success('Removed from watchlist');
    } else {
      await addToWatchlist(id);
      setWatching(true);
      toast.success('Added to watchlist');
    }
  };

  if (loading) return <LoadingSpinner className="min-h-[60vh]" />;
  if (!car) return (
    <div className="page-container text-center py-20">
      <p className="text-gray-400">Vehicle not found</p>
      <Link to="/auctions" className="btn-outline-gold mt-4">Back to Auctions</Link>
    </div>
  );

  const images = car.images || [];
  const specRows = [
    { label: 'Make', value: car.make, icon: Car },
    { label: 'Model', value: car.model, icon: Car },
    { label: 'Year', value: car.year, icon: Calendar },
    { label: 'Mileage', value: car.mileage ? `${Number(car.mileage).toLocaleString()} km` : '—', icon: Gauge },
    { label: 'Engine', value: car.engine, icon: Settings },
    { label: 'Transmission', value: car.transmission, icon: Settings },
    { label: 'Fuel Type', value: car.fuel_type, icon: Fuel },
    { label: 'Drive', value: car.drive, icon: Car },
    { label: 'Color', value: car.color, icon: null },
    { label: 'Doors', value: car.doors, icon: null },
    { label: 'Seats', value: car.seats, icon: Users },
    { label: 'Grade', value: car.grade, icon: null },
    { label: 'Chassis #', value: car.chassis_number, icon: Hash },
    { label: 'Lot #', value: car.lot_number, icon: Hash },
  ].filter(s => s.value);

  return (
    <div className="page-container">
      <Link to="/auctions" className="inline-flex items-center gap-2 text-gray-500 hover:text-gold-400 transition-colors text-sm mb-6">
        <ArrowLeft size={15} /> Back to Auctions
      </Link>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-dark-300 aspect-[4/3]">
            {images.length > 0 ? (
              <>
                <img
                  src={images[imgIdx]?.image_path}
                  alt={`${car.make} ${car.model}`}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => setImgIdx(i => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button key={i} onClick={() => setImgIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-gold-400 w-4' : 'bg-white/40'}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                <Car size={64} className="mb-3" />
                <p className="text-sm">No images available</p>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-6 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`rounded-xl overflow-hidden aspect-square border-2 transition-all ${i === imgIdx ? 'border-gold-500' : 'border-transparent opacity-60 hover:opacity-80'}`}
                >
                  <img src={img.image_path} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="card p-5">
            <h3 className="text-white font-semibold mb-4">Vehicle Specifications</h3>
            <div className="grid grid-cols-2 gap-3">
              {specRows.map(({ label, value }) => (
                <div key={label} className="flex flex-col bg-dark-400 rounded-xl p-3">
                  <span className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</span>
                  <span className="text-white text-sm font-medium capitalize">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {car.description && (
            <div className="card p-5">
              <h3 className="text-white font-semibold mb-3">Description</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{car.description}</p>
            </div>
          )}

          <AuctionSheetLegend />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6 sticky top-20">
            <div className="flex items-start justify-between mb-1">
              <h1 className="text-2xl font-bold text-white">{car.year} {car.make} {car.model}</h1>
              <button onClick={handleWatchlist} className={`p-2 rounded-xl border transition-all ${watching ? 'border-gold-500/30 bg-gold-500/10 text-gold-400' : 'border-white/10 text-gray-500 hover:text-gold-400'}`}>
                <Heart size={18} fill={watching ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-5">
              <StatusBadge status={car.status} type="car" />
              {car.grade && <span className="badge-gold">Grade {car.grade}</span>}
            </div>

            {car.auction_name && (
              <div className="bg-dark-400 rounded-xl p-4 mb-5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={14} className="text-gold-500" />
                  <span className="text-gray-400">{car.auction_name}</span>
                </div>
                {car.auction_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={14} className="text-gold-500" />
                    <span className="text-gray-400">{car.auction_location}</span>
                  </div>
                )}
                {car.auction_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {new Date(car.auction_date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <CountdownTimer targetDate={car.auction_date} />
                  </div>
                )}
              </div>
            )}

            <div className="mb-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-sm">Starting Bid</span>
                {car.bid_count > 0 && <span className="text-xs text-gray-600">{car.bid_count} bid{car.bid_count !== 1 ? 's' : ''}</span>}
              </div>
              <p className="text-3xl font-black text-gold-500">
                {car.starting_price ? `¥${Number(car.starting_price).toLocaleString()}` : 'Price on Request'}
              </p>
              {car.current_bid && Number(car.current_bid) > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Current Highest: <span className="text-emerald-400 font-semibold">¥{Number(car.current_bid).toLocaleString()}</span>
                </p>
              )}
            </div>

            {car.status !== 'sold' ? (
              user ? (
                <button onClick={() => setBidOpen(true)} className="btn-gold w-full justify-center py-3.5 text-base">
                  Place Bid Request
                </button>
              ) : (
                <Link to="/login" className="btn-gold w-full justify-center py-3.5 text-base block text-center">
                  Sign In to Bid
                </Link>
              )
            ) : (
              <div className="w-full py-3.5 rounded-xl bg-gray-700/20 text-gray-500 text-center text-sm font-medium">
                Vehicle Sold
              </div>
            )}

            <p className="text-xs text-gray-600 text-center mt-3">
              Bid requests are reviewed by our team within 24 hours
            </p>
          </div>
        </div>
      </div>

      {bidOpen && <BidModal car={car} onClose={() => setBidOpen(false)} onSuccess={() => getCar(id).then(r => setCar(r.data))} />}
    </div>
  );
}
