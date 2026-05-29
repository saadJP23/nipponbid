import React, { useState } from 'react';
import { X, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { placeBid } from '../services/api';
import toast from 'react-hot-toast';

export default function BidModal({ car, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const minBid = Math.max(Number(car.current_bid || 0), Number(car.starting_price || 0));
  const suggestions = [minBid + 50000, minBid + 100000, minBid + 200000].filter(v => v > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = Number(amount);
    if (!val || val <= 0) return toast.error('Please enter a valid bid amount');
    if (val < minBid) return toast.error(`Bid must be at least ¥${minBid.toLocaleString()}`);

    setLoading(true);
    try {
      await placeBid({ car_id: car.id, amount: val });
      toast.success('Bid submitted successfully!');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 animate-fade-up">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-xl">Place Bid Request</h2>
            <p className="text-gray-400 text-sm mt-1">{car.year} {car.make} {car.model}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        <div className="bg-dark-400 rounded-xl p-4 mb-5 space-y-2">
          {car.lot_number && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Lot Number</span>
              <span className="text-white font-medium">#{car.lot_number}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Starting Price</span>
            <span className="text-white font-medium">¥{Number(car.starting_price || 0).toLocaleString()}</span>
          </div>
          {car.current_bid && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Current Bid</span>
              <span className="text-emerald-400 font-semibold">¥{Number(car.current_bid).toLocaleString()}</span>
            </div>
          )}
          <div className="border-t border-white/5 pt-2 flex justify-between text-sm">
            <span className="text-gray-400">Minimum Bid</span>
            <span className="text-gold-400 font-bold">¥{minBid.toLocaleString()}</span>
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><TrendingUp size={11} /> Quick Select</p>
            <div className="flex gap-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAmount(String(s))}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${amount === String(s) ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}
                >
                  ¥{s.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="label">Your Bid Amount (JPY ¥)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500 font-semibold text-sm">¥</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={minBid.toLocaleString()}
                min={minBid}
                className="input-field pl-8"
              />
            </div>
            {amount && Number(amount) < minBid && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertTriangle size={11} /> Bid must be at least ¥{minBid.toLocaleString()}
              </p>
            )}
          </div>

          <div className="bg-gold-500/5 border border-gold-500/10 rounded-xl p-3 mb-5 text-xs text-gray-400">
            <p>Your bid request will be reviewed by our team. You'll receive a notification once approved or rejected.</p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-gold flex-1 justify-center">
              {loading ? <span className="w-4 h-4 border-2 border-dark-50/30 border-t-dark-50 rounded-full animate-spin" /> : 'Submit Bid Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}