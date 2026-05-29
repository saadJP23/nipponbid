import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Car, Calendar, Gauge, Zap, Star, FileText, X,
  Send, CheckCircle, Clock, Trophy, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getJapanCar, placeJapanBid, getMyJapanBids } from '../services/api';

const gradeColor = (g) =>
  parseFloat(g) >= 4.5 ? '#34d399' :
  parseFloat(g) >= 3.5 ? '#fbbf24' :
  parseFloat(g) >= 3   ? '#fb923c' : 'var(--ae-ink-muted)';

const fmt = (n) => n != null ? Number(n).toLocaleString() : '—';

export default function JapaneseCarDetail() {
  const { pid } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [car,        setCar]        = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [myBid,      setMyBid]      = useState(null);
  const [amount,     setAmount]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bidDone,    setBidDone]    = useState(false);
  const [error,      setError]      = useState('');
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [imgIdx,     setImgIdx]     = useState(0);

  useEffect(() => {
    setLoading(true);
    getJapanCar(pid)
      .then(r => {
        setCar(r.data);
        if (r.data?.start_price) setAmount(String(r.data.start_price));
      })
      .catch(() => setCar(null))
      .finally(() => setLoading(false));

    if (user) {
      getMyJapanBids().then(r => {
        const existing = (r.data || []).find(b => b.pid === pid);
        if (existing) { setMyBid(existing); setAmount(String(existing.amount)); }
      }).catch(() => {});
    }
  }, [pid, user]);

  const allImages = car ? [
    car.image_url,
    ...(Array.isArray(car.extra_images) ? car.extra_images : []),
  ].filter(Boolean) : [];

  const handleBid = async () => {
    if (!amount || isNaN(amount) || +amount <= 0) { setError('Enter a valid bid amount'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await placeJapanBid({ pid, amount: +amount });
      setMyBid(res.data);
      setBidDone(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit bid');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div data-theme="light" className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ae-canvas)' }}>
      <div className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Loading car details…</div>
    </div>
  );

  if (!car) return (
    <div data-theme="light" className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--ae-canvas)' }}>
      <Car size={48} style={{ color: 'var(--ae-ink-faint)' }} />
      <p style={{ color: 'var(--ae-ink-muted)' }}>Car not found</p>
      <button onClick={() => navigate('/japanese-auctions')} className="btn-outline-gold text-sm">← Back</button>
    </div>
  );

  const auctionDateStr = car.auction_date
    ? new Date(car.auction_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const isExpired = car.auction_date
    ? new Date(car.auction_date).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)
    : false;

  const statusColor =
    car.status === 'upcoming'  ? '#34d399' :
    car.status === 'purchased' ? 'var(--ae-red)' : 'var(--ae-ink-faint)';

  return (
    <div data-theme="light" className="min-h-screen" style={{ background: 'var(--ae-canvas)' }}>

      <div className="max-w-7xl mx-auto px-4 pt-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="btn-ghost text-sm gap-1.5 pl-0">
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ color: 'var(--ae-ink-faint)' }} className="text-xs">|</span>
          <span style={{ color: 'var(--ae-ink-muted)' }} className="text-xs truncate">{car.make} {car.model} {car.year}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 pb-12">

          <div className="lg:col-span-3 space-y-6">

            <div className="card overflow-hidden" style={{ borderRadius: '1.25rem' }}>
              <div className="relative" style={{ aspectRatio: '16/10', background: 'var(--ae-glass-bg)' }}>
                {allImages.length > 0 ? (
                  <img
                    src={allImages[imgIdx]?.startsWith('/') ? allImages[imgIdx] : `${allImages[imgIdx]}&w=900`}
                    alt={`${car.make} ${car.model}`}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.opacity = 0; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Car size={60} style={{ color: 'var(--ae-ink-faint)' }} />
                  </div>
                )}

                {car.auction_grade && (
                  <div className="absolute top-3 left-3 liquid-glass rounded-full px-3 py-1 flex items-center gap-1.5">
                    <Star size={11} style={{ color: gradeColor(car.auction_grade) }} />
                    <span className="text-xs font-semibold" style={{ color: gradeColor(car.auction_grade) }}>
                      Grade {car.auction_grade}
                    </span>
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span className="liquid-glass rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ color: statusColor }}>{car.status}</span>
                  {car.sheet_url && (
                    <button onClick={() => setSheetOpen(true)}
                      className="liquid-glass rounded-full px-2.5 py-1 flex items-center gap-1 text-xs hover:text-white transition-colors"
                      style={{ color: 'var(--ae-ink-muted)' }}>
                      <FileText size={11} /> Sheet
                    </button>
                  )}
                </div>

                {allImages.length > 1 && (
                  <>
                    <button onClick={() => setImgIdx(i => (i - 1 + allImages.length) % allImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 liquid-glass rounded-full p-1.5"
                      style={{ color: 'var(--ae-ink-muted)' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setImgIdx(i => (i + 1) % allImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 liquid-glass rounded-full p-1.5"
                      style={{ color: 'var(--ae-ink-muted)' }}>
                      <ChevronRight size={16} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                      {allImages.slice(0, 8).map((_, i) => (
                        <button key={i} onClick={() => setImgIdx(i)}
                          className="w-1.5 h-1.5 rounded-full transition-all"
                          style={{ background: i === imgIdx ? 'var(--ae-ink)' : 'var(--ae-ink-faint)' }} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {allImages.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {allImages.slice(0, 10).map((img, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className="shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all"
                      style={{ borderColor: i === imgIdx ? 'var(--ae-red)' : 'transparent' }}>
                      <img src={img?.startsWith('/') ? img : `${img}&w=200`} alt="" className="w-full h-full object-cover" onError={e => e.target.style.opacity=0} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-6">
              <h2 className="font-bold text-2xl mb-5" style={{ color: 'var(--ae-ink)', letterSpacing: '-0.5px' }}>
                {car.make} <span style={{ color: 'var(--ae-ink-muted)' }}>{car.model}</span>
                {car.year && <span className="ml-2 font-normal text-xl" style={{ color: 'var(--ae-ink-faint)' }}>{car.year}</span>}
              </h2>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {[
                  { label: 'Make',          value: car.make },
                  { label: 'Model',         value: car.model },
                  { label: 'Year',          value: car.year },
                  { label: 'Chassis No.',   value: car.chassis },
                  { label: 'Lot No.',       value: car.lot_number },
                  { label: 'Mileage',       value: car.mileage != null ? `${fmt(car.mileage)} km` : null },
                  { label: 'Engine CC',     value: car.cc ? `${fmt(car.cc)} cc` : null },
                  { label: 'Transmission',  value: car.transmission },
                  { label: 'Color',         value: car.color },
                  { label: 'Grade',         value: car.auction_grade },
                  { label: 'Auction House', value: car.auction_house },
                  { label: 'Auction Date',  value: auctionDateStr },
                  { label: 'Start Price',   value: car.start_price > 0 ? `¥${fmt(car.start_price)}` : null },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--ae-ink-faint)' }}>{label}</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--ae-ink)' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">

            <div className="card p-5">
              <p className="text-xs mb-1" style={{ color: 'var(--ae-ink-faint)' }}>Starting Price</p>
              <p className="font-bold text-3xl" style={{ color: 'var(--ae-red)', letterSpacing: '-1px' }}>
                {car.start_price > 0 ? `¥${fmt(car.start_price)}` : 'Contact for price'}
              </p>
              {car.auction_date && (
                <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--ae-ink-faint)' }}>
                  <Calendar size={11} /> Auction: {new Date(car.auction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>

            {isExpired ? (
              <div className="card p-5 text-center">
                <Clock size={28} className="mx-auto mb-3" style={{ color: 'var(--ae-ink-faint)' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--ae-ink)' }}>Auction Closed</p>
                <p className="text-xs mt-1" style={{ color: 'var(--ae-ink-muted)' }}>This auction ended on {auctionDateStr}. Bidding is no longer available.</p>
                <Link to="/japanese-auctions" className="btn-outline-gold w-full justify-center mt-4 text-sm">Browse Active Listings</Link>
              </div>
            ) : !user ? (
              <div className="card p-5 text-center">
                <p className="text-sm mb-4" style={{ color: 'var(--ae-ink-muted)' }}>Sign in to place a bid on this car</p>
                <Link to="/login" className="btn-gold w-full justify-center">Sign In to Bid</Link>
              </div>
            ) : car.status === 'purchased' ? (
              <div className="card p-5 text-center">
                <Trophy size={28} className="text-yellow-400 mx-auto mb-3" />
                <p className="font-semibold text-sm" style={{ color: 'var(--ae-ink)' }}>This car has been purchased</p>
                <p className="text-xs mt-1" style={{ color: 'var(--ae-ink-muted)' }}>No longer available for bidding</p>
              </div>
            ) : myBid?.status === 'won' ? (
              <div className="card p-5 text-center border border-green-500/20">
                <Trophy size={28} className="text-yellow-400 mx-auto mb-3" />
                <p className="font-semibold" style={{ color: 'var(--ae-ink)' }}>Congratulations! You won!</p>
                <p className="text-sm mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Winning bid: ¥{fmt(myBid.amount)}</p>
                <Link to="/my-japan-purchases" className="btn-gold w-full justify-center mt-4">View My Purchase</Link>
              </div>
            ) : myBid?.status === 'lost' ? (
              <div className="card p-5 text-center">
                <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
                <p className="font-semibold" style={{ color: 'var(--ae-ink)' }}>Bid unsuccessful</p>
                <p className="text-xs mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Your bid of ¥{fmt(myBid.amount)} was not accepted</p>
                <Link to="/japanese-auctions" className="btn-outline-gold w-full justify-center mt-4 text-sm">Browse More Cars</Link>
              </div>
            ) : (
              <div className="card p-5 space-y-4">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--ae-ink)' }}>
                  {myBid ? 'Update Your Bid' : 'Place Your Bid'}
                </h3>

                {myBid && !bidDone && (
                  <div className="liquid-glass rounded-xl p-3 flex items-center gap-2.5">
                    <Clock size={14} className="text-yellow-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--ae-ink-muted)' }}>Current bid: ¥{fmt(myBid.amount)}</p>
                      <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>Submitted {new Date(myBid.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                {bidDone ? (
                  <div className="text-center py-4">
                    <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
                    <p className="font-semibold text-sm" style={{ color: 'var(--ae-ink)' }}>Bid Submitted!</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ae-ink-muted)' }}>
                      ¥{fmt(+amount)} — we'll email you the result after the auction.
                    </p>
                    <Link to="/my-japan-purchases" className="btn-ghost text-xs mt-4">View My Bids</Link>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="label text-xs">Your Bid Amount (¥)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--ae-ink-faint)' }}>¥</span>
                        <input
                          type="number"
                          className="input-field pl-8"
                          placeholder={car.start_price > 0 ? car.start_price.toString() : '0'}
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          min={car.start_price || 0}
                          step="1000"
                        />
                      </div>
                      {car.start_price > 0 && (
                        <p className="text-xs mt-1" style={{ color: 'var(--ae-ink-faint)' }}>Minimum: ¥{fmt(car.start_price)}</p>
                      )}
                    </div>

                    {error && (
                      <p className="text-red-400 text-xs flex items-center gap-1.5">
                        <AlertCircle size={12} /> {error}
                      </p>
                    )}

                    <button onClick={handleBid} disabled={submitting}
                      className="btn-gold w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                      <Send size={14} />
                      {submitting ? 'Submitting…' : myBid ? 'Update Bid' : 'Submit Bid'}
                    </button>

                    <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--ae-ink-faint)' }}>
                      Your bid goes directly to our team. We'll bid on your behalf at the live auction.
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="card p-4 space-y-3">
              {[
                { icon: Calendar, text: `Auction: ${car.auction_house || 'Japan'}` },
                { icon: Gauge,    text: car.mileage != null ? `${fmt(car.mileage)} km driven` : 'Mileage not specified' },
                { icon: Zap,      text: car.cc ? `${fmt(car.cc)} cc engine` : 'CC not specified' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--ae-ink-muted)' }}>
                  <Icon size={13} className="shrink-0" /> {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {sheetOpen && car.sheet_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSheetOpen(false)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSheetOpen(false)}
              className="absolute -top-10 right-0 flex items-center gap-2 text-sm"
              style={{ color: 'var(--ae-ink-muted)' }}>
              <X size={16} /> Close
            </button>
            <div className="card p-3">
              <img src={car.sheet_url} alt="Auction Sheet" className="w-full rounded-xl" style={{ maxHeight: '80vh', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
