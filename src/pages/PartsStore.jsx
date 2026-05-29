import { useState } from 'react'

const PARTS = [
  { id:1, name:'Toyota 2JZ-GTE Complete Engine Assembly', sku:'TY-2JZGTE-001', compat:['JZA80 Supra','JZZ30 Soarer'], price:'¥285,000', usd:'≈$1,900', store:'Yahoo JP',  condition:'Used OEM', cat:'Engine' },
  { id:2, name:'OEM Nissan GT-R R35 Brembo Brake Kit',   sku:'NS-R35BRK-001', compat:['BNR35 GT-R'],                price:'¥142,000', usd:'≈$950',  store:'Monotaro', condition:'New OEM',  cat:'Brakes' },
  { id:3, name:'Subaru EJ207 STi Turbo Cartridge',        sku:'SB-EJ207TB-01', compat:['GD WRX','GR STI'],          price:'¥98,000',  usd:'≈$655',  store:'Yahoo JP',  condition:'Used OEM', cat:'Turbo' },
  { id:4, name:'Lexus IS-F 2UR-GSE V8 Short Block',       sku:'LX-2URGSE-SB',  compat:['USE20 IS-F'],               price:'¥420,000', usd:'≈$2,800',store:'Monotaro', condition:'Used OEM', cat:'Engine' },
  { id:5, name:'Honda NSX NA2 C32B Engine Complete',      sku:'HN-C32B-NA2',   compat:['NA1 NSX','NA2 NSX'],        price:'¥380,000', usd:'≈$2,540',store:'Yahoo JP',  condition:'Used OEM', cat:'Engine' },
  { id:6, name:'Toyota 1UZ-FE V8 Long Block Assembly',    sku:'TY-1UZFE-LB',   compat:['UZZ30 SC400','UZZ32'],      price:'¥195,000', usd:'≈$1,300',store:'Rakuten',   condition:'Used OEM', cat:'Engine' },
  { id:7, name:'Nissan SR20DET Full Engine + Turbo',       sku:'NS-SR20DET-F',  compat:['S13 Silvia','S14','S15'],   price:'¥88,000',  usd:'≈$587',  store:'Monotaro', condition:'Used OEM', cat:'Engine' },
  { id:8, name:'Mazda 13B REW Twin-Turbo Complete',       sku:'MZ-13BREW-TT',  compat:['FD3S RX-7'],                price:'¥165,000', usd:'≈$1,100',store:'Yahoo JP',  condition:'Used OEM', cat:'Engine' },
  { id:9, name:'Toyota 3S-GTE Engine + Turbo Kit',        sku:'TY-3SGTE-KT',   compat:['SW20 MR2','ST185'],         price:'¥112,000', usd:'≈$748',  store:'Amazon JP', condition:'Used OEM', cat:'Engine' },
  { id:10,name:'Mitsubishi 4G63T EVO Engine Rebuild Kit', sku:'MT-4G63-RBK',   compat:['CP9A Evo VI','CT9A Evo IX'],price:'¥45,000',  usd:'≈$300',  store:'Monotaro', condition:'Aftermarket',cat:'Engine' },
  { id:11,name:'JDM Toyota MR2 SW20 Hood Panel OEM',      sku:'TY-SW20-HP',    compat:['SW20 MR2'],                 price:'¥38,500',  usd:'≈$257',  store:'Yahoo JP',  condition:'Used OEM', cat:'Body' },
  { id:12,name:'Subaru STI Front Bumper Assembly OEM',    sku:'SB-GRB-FB',     compat:['GRB WRX STI'],              price:'¥62,000',  usd:'≈$414',  store:'Yahoo JP',  condition:'Used OEM', cat:'Body' },
]

const STORES = { 'Yahoo JP': 'bg-amber-100 text-amber-800', 'Monotaro': 'bg-blue-100 text-blue-800', 'Rakuten': 'bg-red-100 text-red-700', 'Amazon JP': 'bg-orange-100 text-orange-700' }
const CATEGORIES = ['All Parts','Engine','Turbo','Brakes','Body','Interior','Suspension','Electronics']

export default function PartsStore() {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All Parts')
  const [store, setStore] = useState('')
  const [cart, setCart] = useState(new Set())

  const filtered = PARTS.filter(p =>
    (cat === 'All Parts' || p.cat === cat) &&
    (!store || p.store === store) &&
    (!search || `${p.name} ${p.sku} ${p.compat.join(' ')}`.toLowerCase().includes(search.toLowerCase()))
  )

  const toggleCart = id => setCart(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="p-lg bg-background min-h-full">
      <div className="flex gap-lg">
        <aside className="w-[220px] flex-shrink-0 space-y-md">
          <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
            <h4 className="text-label-md text-on-surface-variant uppercase tracking-wide mb-sm">Categories</h4>
            <ul className="space-y-[2px]">
              {CATEGORIES.map(c => (
                <li key={c}>
                  <button
                    onClick={() => setCat(c)}
                    className={`w-full text-left px-sm py-[7px] rounded-lg text-body-sm transition-colors ${
                      cat === c
                        ? 'bg-secondary/10 text-secondary font-semibold'
                        : 'text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
            <h4 className="text-label-md text-on-surface-variant uppercase tracking-wide mb-sm">Condition</h4>
            {['New OEM','Used OEM','Aftermarket'].map(c => (
              <label key={c} className="flex items-center gap-sm py-[5px] cursor-pointer">
                <input type="checkbox" defaultChecked={c !== 'Aftermarket'}
                       className="rounded border-outline-variant text-secondary focus:ring-secondary/40" />
                <span className="text-body-sm text-on-surface">{c}</span>
              </label>
            ))}
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md">
            <h4 className="text-label-md text-on-surface-variant uppercase tracking-wide mb-sm">Source Store</h4>
            <button onClick={() => setStore('')}
              className={`w-full text-left px-sm py-[7px] rounded-lg text-body-sm mb-[2px] transition-colors ${!store ? 'bg-secondary/10 text-secondary font-semibold' : 'hover:bg-surface-container text-on-surface'}`}>
              All Stores
            </button>
            {Object.keys(STORES).map(s => (
              <button key={s} onClick={() => setStore(s === store ? '' : s)}
                className={`w-full text-left px-sm py-[7px] rounded-lg text-body-sm transition-colors ${store === s ? 'bg-secondary/10 text-secondary font-semibold' : 'hover:bg-surface-container text-on-surface'}`}>
                {s}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-sm mb-md">
            <div className="relative flex-1">
              <span className="absolute left-sm top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search parts, SKU, compatibility…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-[36px] pr-sm py-[9px] bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
              />
            </div>
            <select className="px-sm py-[9px] bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/40">
              <option>Sort: Relevance</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest</option>
            </select>
            <span className="text-body-sm text-on-surface-variant whitespace-nowrap">{filtered.length} parts</span>
            {cart.size > 0 && (
              <button className="flex items-center gap-xs px-md py-[9px] bg-secondary text-white rounded-lg text-body-sm font-semibold hover:bg-secondary/90 transition-colors shadow-sm">
                <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                {cart.size}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
            {filtered.map(p => (
              <div key={p.id}
                   className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow hover:shadow-md hover:border-outline/50 transition-all duration-200 overflow-hidden group">
                <div className="h-[140px] bg-gradient-to-br from-surface-container to-surface-container-high flex items-center justify-center relative">
                  <span className="material-symbols-outlined text-outline text-[48px]"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>settings_input_component</span>
                  <div className="absolute top-xs right-xs">
                    <span className={`text-[10px] font-bold px-xs py-[2px] rounded-full ${STORES[p.store]}`}>
                      {p.store}
                    </span>
                  </div>
                </div>

                <div className="p-md">
                  <h3 className="text-body-sm font-bold text-on-surface leading-snug mb-xs line-clamp-2 group-hover:text-secondary transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-label-sm text-on-surface-variant font-mono-data mb-sm">{p.sku}</p>

                  <div className="flex flex-wrap gap-[4px] mb-sm">
                    {p.compat.map(c => (
                      <span key={c} className="text-[10px] bg-surface-container text-on-surface-variant px-xs py-[2px] rounded-full border border-outline-variant/50">
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-end justify-between mt-sm">
                    <div>
                      <p className="text-headline-sm font-bold text-on-surface font-mono-data">{p.price}</p>
                      <p className="text-label-sm text-on-surface-variant">{p.usd}</p>
                    </div>
                    <div className="flex gap-xs">
                      <button
                        onClick={() => toggleCart(p.id)}
                        className={`px-sm py-[7px] rounded-lg text-body-sm font-semibold transition-all ${
                          cart.has(p.id)
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-secondary text-white hover:bg-secondary/90 shadow-sm'
                        }`}
                      >
                        {cart.has(p.id) ? '✓ Added' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-2xl text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-md">search_off</span>
              <p className="text-body-lg font-semibold">No parts found</p>
              <p className="text-body-sm mt-xs">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
