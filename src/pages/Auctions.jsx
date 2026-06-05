import { useEffect, useState, useCallback } from 'react'
import { getCars, getCar, getAuctions, getMakes, resolveImageUrl } from '../services/api'
import { Car, ChevronLeft, ChevronRight, ChevronDown, Search, X } from 'lucide-react'
import Drawer from '../components/Drawer'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_BADGE = {
  active:    'badge-green',
  purchased: 'badge-grey',
  sold:      'badge-blue',
  past:      'badge-grey',
}

const TRANSMISSION_LABEL = { automatic: 'Auto', manual: 'Manual', cvt: 'CVT', other: 'Other' }
const FUEL_LABEL = { petrol: 'Petrol', diesel: 'Diesel', hybrid: 'Hybrid', electric: 'Electric', other: 'Other' }

export default function Auctions() {
  const [cars, setCars]         = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [pages, setPages]       = useState(1)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // filter state
  const [auctions, setAuctions] = useState([])
  const [makes, setMakes]       = useState([])
  const [filters, setFilters]   = useState({
    search: '', make: '', auction_id: '', status: '', year_min: '', year_max: '',
  })
  const [applied, setApplied]   = useState({})

  useEffect(() => {
    getAuctions().then(r => setAuctions(r.data || [])).catch(() => {})
    getMakes().then(r => setMakes(r.data || [])).catch(() => {})
  }, [])

  const load = useCallback((p, params) => {
    setLoading(true)
    getCars({ page: p, limit: 16, ...params })
      .then(r => {
        setCars(r.data.cars || [])
        setTotal(r.data.total || 0)
        setPages(r.data.pages || 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(1, {}) }, [load])

  const setF = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }))

  const handleApply = () => {
    const params = {}
    if (filters.search)     params.search     = filters.search
    if (filters.make)       params.make       = filters.make
    if (filters.auction_id) params.auction_id = filters.auction_id
    if (filters.status)     params.status     = filters.status
    if (filters.year_min)   params.year_min   = filters.year_min
    if (filters.year_max)   params.year_max   = filters.year_max
    setApplied(params)
    setPage(1)
    load(1, params)
  }

  const handleClear = () => {
    setFilters({ search: '', make: '', auction_id: '', status: '', year_min: '', year_max: '' })
    setApplied({})
    setPage(1)
    load(1, {})
  }

  const goPage = (p) => {
    setPage(p)
    load(p, applied)
  }

  const openCar = (car) => {
    setSelected(car)
    setDetail(null)
    setDetailLoading(true)
    getCar(car.car_id)
      .then(r => setDetail(r.data))
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }

  const hasFilters = Object.values(applied).some(Boolean)

  return (
    <>
      <div className="space-y-5 animate-slide-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Auctions</h1>
            <p className="page-subtitle">{fmt(total)} cars listed</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="card p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="label">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400" />
              <input className="input pl-8" placeholder="Make, model, chassis…"
                value={filters.search} onChange={setF('search')}
                onKeyDown={e => e.key === 'Enter' && handleApply()} />
            </div>
          </div>
          <div>
            <label className="label">Auction</label>
            <select className="input min-w-[180px]" value={filters.auction_id} onChange={setF('auction_id')}>
              <option value="">All Auctions</option>
              {auctions.map(a => (
                <option key={a.auction_id} value={a.auction_id}>{a.auction_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Make</label>
            <select className="input min-w-[130px]" value={filters.make} onChange={setF('make')}>
              <option value="">All Makes</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={filters.status} onChange={setF('status')}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="purchased">Purchased</option>
              <option value="sold">Sold</option>
              <option value="past">Past</option>
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <div>
              <label className="label">Year From</label>
              <input className="input w-24" type="number" placeholder="2010" value={filters.year_min} onChange={setF('year_min')} />
            </div>
            <div>
              <label className="label">Year To</label>
              <input className="input w-24" type="number" placeholder="2024" value={filters.year_max} onChange={setF('year_max')} />
            </div>
          </div>
          <div className="flex gap-2 pb-0.5">
            <button className="btn btn-primary" onClick={handleApply}>
              <Search size={14} /> Search
            </button>
            {hasFilters && (
              <button className="btn btn-secondary" onClick={handleClear}>
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Car grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton rounded-lg h-64" />
            ))}
          </div>
        ) : cars.length === 0 ? (
          <div className="card py-20 text-center">
            <Car size={40} className="mx-auto text-grey-300 mb-3" />
            <p className="text-grey-500">No cars found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cars.map(car => (
              <div key={car.car_id}
                onClick={() => openCar(car)}
                className="card-hover overflow-hidden group">
                {/* Image */}
                <div className="relative h-44 bg-grey-100 overflow-hidden">
                  {car.primary_image ? (
                    <img
                      src={resolveImageUrl(car.primary_image)}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car size={36} className="text-grey-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`badge ${STATUS_BADGE[car.status] || 'badge-grey'} shadow-sm`}>
                      {car.status}
                    </span>
                  </div>
                  {car.grade && (
                    <div className="absolute top-2 left-2">
                      <span className="badge badge-blue shadow-sm">Grade {car.grade}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="font-bold text-navy text-sm">{car.year} {car.make} {car.model}</p>
                  <p className="text-xs text-grey-500 mt-0.5 font-mono">{car.chassis_no}</p>

                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {[
                      ['Mileage', car.mileage ? `${fmt(car.mileage)} km` : '—'],
                      ['Color', car.color || '—'],
                      ['Trans.', TRANSMISSION_LABEL[car.transmission] || car.transmission || '—'],
                      ['Fuel', FUEL_LABEL[car.fuel_type] || car.fuel_type || '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[10px] text-grey-400 uppercase tracking-wide">{k}</p>
                        <p className="text-xs font-medium text-navy truncate">{v}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-grey-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-grey-400 uppercase tracking-wide">Starting Price</p>
                      <p className="text-sm font-bold text-navy font-mono">¥ {fmt(car.starting_price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-grey-400 uppercase tracking-wide">Auction</p>
                      <p className="text-xs text-grey-600 truncate max-w-[100px]">{car.auction_name || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-grey-500">{fmt(total)} cars · Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => goPage(Math.max(1, page - 1))} disabled={page === 1}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => goPage(Math.min(pages, page + 1))} disabled={page === pages}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.year} ${selected.make} ${selected.model}` : ''}
        subtitle={selected?.chassis_no}
        width={520}
      >
        {detailLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Image gallery */}
            {detail.images?.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {detail.images.map((img, i) => (
                  <a key={img.car_image_id} href={resolveImageUrl(img.url)} target="_blank" rel="noreferrer"
                    className={`block overflow-hidden rounded ${i === 0 ? 'col-span-3 h-52' : 'h-24'}`}>
                    <img src={resolveImageUrl(img.url)} className="w-full h-full object-cover hover:scale-105 transition-transform" alt="" />
                  </a>
                ))}
              </div>
            )}

            {/* Status + grade badges */}
            <div className="flex gap-2 flex-wrap">
              <span className={`badge ${STATUS_BADGE[detail.status] || 'badge-grey'}`}>{detail.status}</span>
              {detail.grade && <span className="badge badge-blue">Grade {detail.grade}</span>}
              {detail.fuel_type && <span className="badge badge-grey capitalize">{detail.fuel_type}</span>}
              {detail.transmission && <span className="badge badge-grey capitalize">{detail.transmission}</span>}
            </div>

            {/* Vehicle details */}
            <div>
              <p className="label">Vehicle Details</p>
              <div className="card p-3 grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ['Make', detail.make],
                  ['Model', detail.model],
                  ['Year', detail.year],
                  ['Color', detail.color || '—'],
                  ['Chassis No.', detail.chassis_no],
                  ['Mileage', detail.mileage ? `${fmt(detail.mileage)} km` : '—'],
                  ['Engine', detail.engine || '—'],
                  ['Doors', detail.doors || '—'],
                  ['Seats', detail.seats || '—'],
                  ['Transmission', TRANSMISSION_LABEL[detail.transmission] || detail.transmission || '—'],
                  ['Fuel Type', FUEL_LABEL[detail.fuel_type] || detail.fuel_type || '—'],
                  ['Grade', detail.grade || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-grey-400">{k}</p>
                    <p className="text-sm font-medium text-navy">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Auction info */}
            <div>
              <p className="label">Auction Info</p>
              <div className="card p-3">
                {[
                  ['Auction', detail.auction_name || '—'],
                  ['Location', detail.auction_location || '—'],
                  ['Date', fmtDate(detail.auction_date)],
                  ['Auction House', detail.auction_house || '—'],
                  ['Starting Price', `¥ ${fmt(detail.starting_price)}`],
                  ['Bids', detail.bid_count ?? '0'],
                  ['Highest Bid', detail.highest_bid ? `¥ ${fmt(detail.highest_bid)}` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-grey-100 last:border-0">
                    <span className="text-sm text-grey-600">{k}</span>
                    <span className="text-sm font-medium text-navy">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
