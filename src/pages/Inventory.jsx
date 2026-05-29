import { useState } from 'react'

const VEHICLES = [
  { id:'AJ-2847', make:'Toyota',     model:'Land Cruiser 200 VX',    year:2021, chassis:'GRJ200-1234567', purchased:'2024-03-15', price:'¥4,850,000', auction:'USS Tokyo',   status:'IN STOCK',   dest:'Dubai, UAE' },
  { id:'AJ-2846', make:'Nissan',     model:'GT-R Track Edition',     year:2019, chassis:'BNR35-7654321', purchased:'2024-03-14', price:'¥8,200,000', auction:'TAA Osaka',   status:'IN TRANSIT', dest:'United Kingdom' },
  { id:'AJ-2845', make:'Lexus',      model:'LX 570 Sport+',          year:2020, chassis:'URJ200-9988776', purchased:'2024-03-12', price:'¥6,100,000', auction:'JU Sapporo',  status:'AT PORT',    dest:'Germany' },
  { id:'AJ-2844', make:'Honda',      model:'NSX Type S',             year:2022, chassis:'NC1-0011223',   purchased:'2024-03-10', price:'¥12,500,000',auction:'USS Fukuoka', status:'IN STOCK',   dest:'United States' },
  { id:'AJ-2843', make:'Toyota',     model:'GR Supra RZ',            year:2018, chassis:'DB42-4455667',  purchased:'2024-03-08', price:'¥3,800,000', auction:'HAA Tokyo',   status:'IN TRANSIT', dest:'Australia' },
  { id:'AJ-2842', make:'Subaru',     model:'WRX STI Final Edition',  year:2021, chassis:'VAB-8877665',   purchased:'2024-03-06', price:'¥4,200,000', auction:'JU Osaka',    status:'SOLD',       dest:'Netherlands' },
  { id:'AJ-2841', make:'Mazda',      model:'MX-5 Roadster RF',       year:2020, chassis:'ND5RC-1122334', purchased:'2024-03-04', price:'¥2,950,000', auction:'USS Tokyo',   status:'IN STOCK',   dest:'Canada' },
  { id:'AJ-2840', make:'Nissan',     model:'Skyline GT-R V-Spec',    year:2017, chassis:'BNR34-5566778', purchased:'2024-02-28', price:'¥9,800,000', auction:'TAA Nagoya',  status:'AT PORT',    dest:'United Kingdom' },
  { id:'AJ-2839', make:'Mitsubishi', model:'Lancer Evolution X MR',  year:2015, chassis:'CZ4A-9900112',  purchased:'2024-02-25', price:'¥3,200,000', auction:'USS Nagoya',  status:'IN STOCK',   dest:'New Zealand' },
  { id:'AJ-2838', make:'Toyota',     model:'Alphard Executive Lounge',year:2022, chassis:'AGH30-3344556',purchased:'2024-02-22', price:'¥5,400,000', auction:'LAA Okayama', status:'SOLD',       dest:'Qatar' },
]

const STATUS = {
  'IN STOCK':   { style: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  'IN TRANSIT': { style: 'bg-blue-100  text-blue-800',  dot: 'bg-blue-500'  },
  'AT PORT':    { style: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  'SOLD':       { style: 'bg-surface-container-high text-on-surface-variant', dot: 'bg-outline' },
}

const TABS = ['All Vehicles', 'In Transit', 'At Port', 'In Stock', 'Sold']
const TAB_FILTER = {
  'All Vehicles': null,
  'In Transit':   'IN TRANSIT',
  'At Port':      'AT PORT',
  'In Stock':     'IN STOCK',
  'Sold':         'SOLD',
}
const TAB_COUNTS = { 'All Vehicles': 156, 'In Transit': 34, 'At Port': 12, 'In Stock': 87, 'Sold': 23 }

export default function Inventory() {
  const [tab, setTab] = useState('All Vehicles')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())

  const filtered = VEHICLES.filter(v => {
    const statusFilter = TAB_FILTER[tab]
    const q = search.toLowerCase()
    return (
      (!statusFilter || v.status === statusFilter) &&
      (!q || `${v.make} ${v.model} ${v.id} ${v.chassis} ${v.auction}`.toLowerCase().includes(q))
    )
  })

  const toggleSelect = id => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  return (
    <div className="p-lg bg-background min-h-full">
      <div className="flex justify-between items-center mb-md">
        <div className="flex items-center gap-sm">
          {selected.size > 0 && (
            <span className="text-body-sm text-secondary font-semibold">{selected.size} selected</span>
          )}
        </div>
        <div className="flex gap-sm">
          <button className="flex items-center gap-xs px-md py-[9px] bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export CSV
          </button>
          <button className="flex items-center gap-xs px-md py-[9px] bg-secondary text-white rounded-lg text-body-sm font-semibold hover:bg-secondary/90 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Vehicle
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 overflow-hidden">
        <div className="flex border-b border-outline-variant/30 bg-surface-container-low px-md">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-sm py-sm text-body-sm font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
                tab === t
                  ? 'border-secondary text-secondary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t}
              <span className={`ml-xs text-[10px] font-bold px-xs py-[1px] rounded-full ${
                tab === t ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-highest text-on-surface-variant'
              }`}>
                {TAB_COUNTS[t]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-sm p-md border-b border-outline-variant/20">
          <div className="relative flex-1 max-w-[320px]">
            <span className="absolute left-sm top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[16px]">search</span>
            <input
              type="text"
              placeholder="Search stock, chassis, make…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-[34px] pr-sm py-[7px] bg-surface-container border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
            />
          </div>
          {['Make', 'Year', 'Auction House'].map(f => (
            <select key={f}
              className="px-sm py-[7px] bg-surface-container border border-outline-variant rounded-lg text-body-sm text-on-surface cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/40">
              <option>{f}</option>
            </select>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/30">
                <th className="px-md py-xs w-10">
                  <input type="checkbox" className="rounded border-outline-variant" />
                </th>
                {['Stock #','Vehicle','Chassis #','Purchased','Price (¥)','Auction','Status','Destination',''].map(h => (
                  <th key={h} className="px-md py-xs text-label-sm text-on-surface-variant uppercase tracking-wide font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filtered.map(v => (
                <tr key={v.id} className={`hover:bg-surface-container-low transition-colors ${selected.has(v.id) ? 'bg-secondary/5' : ''}`}>
                  <td className="px-md py-sm">
                    <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleSelect(v.id)}
                           className="rounded border-outline-variant" />
                  </td>
                  <td className="px-md py-sm text-body-sm font-bold text-secondary font-mono-data">{v.id}</td>
                  <td className="px-md py-sm">
                    <p className="text-body-sm font-semibold text-on-surface">{v.year} {v.make} {v.model}</p>
                    <p className="text-label-sm text-on-surface-variant mt-0.5">Year {v.year}</p>
                  </td>
                  <td className="px-md py-sm text-body-sm font-mono-data text-on-surface-variant">{v.chassis}</td>
                  <td className="px-md py-sm text-body-sm text-on-surface-variant">{v.purchased}</td>
                  <td className="px-md py-sm text-body-sm font-mono-data font-semibold text-on-surface">{v.price}</td>
                  <td className="px-md py-sm text-body-sm text-on-surface-variant">{v.auction}</td>
                  <td className="px-md py-sm">
                    <span className={`text-[10px] font-bold px-xs py-[3px] rounded-full uppercase tracking-wide whitespace-nowrap ${STATUS[v.status].style}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-md py-sm text-body-sm text-on-surface-variant">{v.dest}</td>
                  <td className="px-md py-sm">
                    <button className="p-1 rounded hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface">
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-md py-sm border-t border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
          <p className="text-body-sm text-on-surface-variant">Showing 1–{filtered.length} of {TAB_COUNTS[tab]} vehicles</p>
          <div className="flex gap-xs">
            {[1,2,3,'…',20].map((p, i) => (
              <button key={i}
                className={`w-8 h-8 rounded-lg text-body-sm font-semibold transition-colors ${
                  p === 1 ? 'bg-secondary text-white' : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
