import React from 'react';
import { Link } from 'react-router-dom';
import { Gauge, Calendar, Tag, Heart } from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import StatusBadge from './StatusBadge';
import { resolveImageUrl } from '../services/api';

export default function CarCard({ car, onWatchlist, isWatching }) {
  const img = resolveImageUrl(car.primary_image || car.image_url);

  return (
    <Link to={`/cars/${car.id}`} className="group block">
      <div className="card-hover overflow-hidden rounded-2xl">
        <div className="relative h-52 overflow-hidden bg-dark-400">
          {img ? (
            <img
              src={img}
              alt={`${car.make} ${car.model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-2">🚗</div>
                <p className="text-gray-600 text-xs">{car.make} {car.model}</p>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-dark-300/90 via-transparent to-transparent" />

          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <StatusBadge status={car.status} type="car" />
              {car.grade && (
                <span className="badge-gold text-xs">Grade {car.grade}</span>
              )}
            </div>
            {onWatchlist && (
              <button
                onClick={(e) => { e.preventDefault(); onWatchlist(car.id); }}
                className={`p-2 rounded-full backdrop-blur-sm transition-colors ${isWatching ? 'bg-gold-500/20 text-gold-400' : 'bg-black/30 text-gray-400 hover:text-gold-400'}`}
              >
                <Heart size={15} fill={isWatching ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>

          {car.lot_number && (
            <div className="absolute bottom-3 left-3">
              <span className="text-xs text-gray-400 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded">
                Lot #{car.lot_number}
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="mb-3">
            <h3 className="text-white font-semibold text-base group-hover:text-gold-400 transition-colors">
              {car.year} {car.make} {car.model}
            </h3>
            {car.auction_name && (
              <p className="text-gray-500 text-xs mt-0.5 truncate">{car.auction_name}</p>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            {car.mileage != null && (
              <span className="flex items-center gap-1">
                <Gauge size={12} />
                {car.mileage.toLocaleString()} km
              </span>
            )}
            {car.engine && (
              <span className="truncate">{car.engine}</span>
            )}
            {car.color && (
              <span className="capitalize">{car.color}</span>
            )}
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Starting Bid</p>
              <p className="text-gold-500 font-bold text-lg">
                {car.starting_price ? `¥${Number(car.starting_price).toLocaleString()}` : 'TBD'}
              </p>
              {car.current_bid && Number(car.current_bid) > Number(car.starting_price) && (
                <p className="text-xs text-gray-500">
                  Current: <span className="text-emerald-400 font-medium">¥{Number(car.current_bid).toLocaleString()}</span>
                </p>
              )}
            </div>
            {car.auction_date && (
              <CountdownTimer targetDate={car.auction_date} />
            )}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="border-t border-white/5 pt-3 flex items-center justify-between">
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Calendar size={11} />
              {car.auction_date ? new Date(car.auction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            </span>
            <span className="text-gold-500 text-xs font-medium group-hover:text-gold-400 flex items-center gap-1">
              View Details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
