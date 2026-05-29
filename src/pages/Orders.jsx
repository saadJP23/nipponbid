import { useState } from 'react'

const ORDERS = [
  { id:'ORD-8847', part:'Toyota Timing Belt Kit',              sku:'TY-TBK-4AGZE',   store:'Yahoo JP',  date:'2024-05-20', est:'Jun 3', tracking:'YT812847JP', amount:'¥28,500',  status:'SHIPPED'    },
  { id:'ORD-8846', part:'Nissan GT-R Brembo Brake Pads Set',   sku:'NS-BP-R35',       store:'Monotaro',  date:'2024-05-19', est:'May 31',tracking:'—',          amount:'¥45,200',  status:'PROCESSING' },
  { id:'ORD-8845', part:'Subaru EJ Engine Head Gasket Kit',    sku:'SB-HG-EJ207',     store:'Yahoo JP',  date:'2024-05-18', est:'May 30',tracking:'YT798234JP', amount:'¥12,800',  status:'SHIPPED'    },
  { id:'ORD-8844', part:'Lexus IS300 Tein Coilover Kit',       sku:'LX-CK-IS300',     store:'Rakuten',   date:'2024-05-17', est:'Jun 5', tracking:'—',          amount:'¥88,000',  status:'PENDING'    },
  { id:'ORD-8843', part:'Honda NSX Door Panel Left OEM',       sku:'HN-DP-NA2L',      store:'Yahoo JP',  date:'2024-05-15', est:'May 28',tracking:'YT781923JP', amount:'¥35,000',  status:'DELIVERED'  },
  { id:'ORD-8842', part:'Toyota LandCruiser Bilstein Shocks',  sku:'TY-SP-GRJ200',    store:'Amazon JP', date:'2024-05-14', est:'May 29',tracking:'AZ449821JP', amount:'¥72,000',  status:'SHIPPED'    },
  { id:'ORD-8841', part:'Mazda RX-7 Apex Seal Set OEM',        sku:'MZ-AS-13B',       store:'Monotaro',  date:'2024-05-12', est:'Jun 8', tracking:'—',          amount:'¥18,500',  status:'PENDING'    },
  { id:'ORD-8840', part:'Mitsubishi EVO IX Full Engine Gasket',sku:'MT-GK-4G63',       store:'Yahoo JP',  date:'2024-05-10', est:'May 26',tracking:'YT765432JP', amount:'¥9,800',   status:'DELIVERED'  },
  { id:'ORD-8839', part:'Nissan SR20DET Rebuild Kit Complete', sku:'NS-RK-SR20DET',   store:'Monotaro',  date:'2024-05-08', est:'Jun 10',tracking:'—',          amount:'¥32,000',  status:'PENDING'    },
  { id:'ORD-8838', part:'Toyota Supra 2JZ Water Pump OEM',     sku:'TY-WP-2JZGTE',   store:'Yahoo JP',  date:'2024-05-06', est:'May 24',tracking:'YT741122JP', amount:'¥14,500',  status:'DELIVERED'  },
]

const STATUS = {
  PENDING:    { style:'bg-amber-100 text-amber-800',  label:'Pending'    },
  PROCESSING: { style:'bg-blue-100  text-blue-800',   label:'Processing' },
  SHIPPED:    { style:'bg-purple-100 text-purple-800',label:'Shipped'    },
  DELIVERED:  { style:'bg-green-100 text-green-800',  label:'Delivered'  },
  CANCELLED:  { style:'bg-red-100   text-red-700',    label:'Cancelled'  },
}

const TABS = ['All Orders','Pending','Processing','Shipped','Delivered','Cancelled']
const COUNTS = { 'All Orders':342,'Pending':28,'Processing':17,'Shipped':67,'Delivered':247,'Cancelled':12 }

const TIMELINE_STEPS = ['Ordered','Processing','Shipped','Out for Delivery','Delivered']

export default function Orders() {
  const [tab, setTab] = useState('All Orders')
  const [selected, setSelected] = useState(null)

  const filtered = ORDERS.filter(o =>
    tab === 'All Orders' || o.status === tab.toUpperCase().replace(' ','_') ||
    (tab === 'Shipped' && o.status === 'SHIPPED') ||
    (tab === 'Pending' && o.status === 'PENDING') ||
    (tab === 'Processing' && o.status === 'PROCESSING') ||
    (tab === 'Delivered' && o.status === 'DELIVERED')
  )

  const detail = selected ? ORDERS.find(o => o.id === selected) : null
  const stepIdx = detail ? { PENDING:0, PROCESSING:1, SHIPPED:2, DELIVERED:4 }[detail.status] ?? 0 : 0

  return (
    <div className="p-lg bg-background min-h-full">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-md mb-lg">
        {[
          { icon:'folder_open',   label:'Total Orders', val:'342', color:'text-on-surface-variant', bg:'bg-surface-container' },
          { icon:'schedule',      label:'Pending',      val:'28',  color:'text-amber-700',          bg:'bg-amber-50' },
          { icon:'local_shipping',label:'In Transit',   val:'67',  color:'text-blue-700',           bg:'bg-blue-50' },
          { icon:'check_circle',  label:'Delivered',    val:'247', color:'text-green-700',          bg:'bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md flex items-center gap-md">
            <div className={`${s.bg} p-sm rounded-xl`}>
              <span className={`material-symbols-outlined ${s.color} text-[22px]`}
                    style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">{s.label}</p>
              <p className="text-[26px] font-bold text-on-surface font-mono-data leading-tight">{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-lg">
        <div className="flex-1 min-w-0 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 overflow-hidden">
          <div className="flex border-b border-outline-variant/30 bg-surface-container-low px-md overflow-x-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-sm py-sm text-body-sm font-semibold border-b-2 whitespace-nowrap -mb-px transition-colors ${
                  tab === t ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}>
                {t}
                <span className={`ml-xs text-[10px] font-bold px-xs py-[1px] rounded-full ${
                  tab === t ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-highest text-on-surface-variant'
                }`}>{COUNTS[t]}</span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  {['Order ID','Part Details','Store','Order Date','Est. Delivery','Tracking','Amount','Status',''].map(h => (
                    <th key={h} className="px-md py-xs text-label-sm text-on-surface-variant uppercase tracking-wide font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filtered.map(o => (
                  <tr key={o.id}
                      onClick={() => setSelected(selected === o.id ? null : o.id)}
                      className={`cursor-pointer transition-colors ${selected === o.id ? 'bg-secondary/5' : 'hover:bg-surface-container-low'}`}>
                    <td className="px-md py-sm text-body-sm font-mono-data font-bold text-secondary">{o.id}</td>
                    <td className="px-md py-sm">
                      <p className="text-body-sm font-semibold text-on-surface">{o.part}</p>
                      <p className="text-label-sm text-on-surface-variant font-mono-data mt-0.5">{o.sku}</p>
                    </td>
                    <td className="px-md py-sm">
                      <span className="text-[10px] font-bold px-xs py-[2px] rounded bg-surface-container-high text-on-surface-variant">{o.store}</span>
                    </td>
                    <td className="px-md py-sm text-body-sm text-on-surface-variant">{o.date}</td>
                    <td className="px-md py-sm text-body-sm text-on-surface-variant">{o.est}</td>
                    <td className="px-md py-sm text-body-sm font-mono-data text-on-surface-variant">{o.tracking}</td>
                    <td className="px-md py-sm text-body-sm font-mono-data font-semibold text-on-surface">{o.amount}</td>
                    <td className="px-md py-sm">
                      <span className={`text-[10px] font-bold px-xs py-[3px] rounded-full uppercase tracking-wide ${STATUS[o.status].style}`}>
                        {STATUS[o.status].label}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                        {selected === o.id ? 'chevron_right' : 'open_in_new'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-md py-sm border-t border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
            <p className="text-body-sm text-on-surface-variant">Showing 1–{filtered.length} of {COUNTS[tab]}</p>
            <div className="flex gap-xs">
              {[1,2,3,'…',35].map((p,i) => (
                <button key={i} className={`w-8 h-8 rounded-lg text-body-sm font-semibold transition-colors ${
                  p===1 ? 'bg-secondary text-white' : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
                }`}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {detail && (
          <div className="w-[300px] flex-shrink-0 bg-surface-container-lowest rounded-xl shadow border border-outline-variant/30 p-md self-start sticky top-[80px]">
            <div className="flex justify-between items-start mb-md">
              <div>
                <p className="text-headline-sm font-bold text-on-surface">{detail.id}</p>
                <p className="text-label-sm text-on-surface-variant mt-0.5">{detail.store}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">close</span>
              </button>
            </div>

            <div className="bg-surface-container rounded-lg p-sm mb-md">
              <p className="text-body-sm font-semibold text-on-surface">{detail.part}</p>
              <p className="text-label-sm text-on-surface-variant font-mono-data mt-0.5">{detail.sku}</p>
              <p className="text-headline-sm font-bold text-on-surface font-mono-data mt-sm">{detail.amount}</p>
            </div>

            <h4 className="text-label-md text-on-surface-variant uppercase tracking-wide mb-sm">Order Timeline</h4>
            <div className="space-y-sm">
              {TIMELINE_STEPS.map((step, i) => {
                const done = i < stepIdx
                const active = i === stepIdx
                return (
                  <div key={step} className="flex gap-sm items-start">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                        done   ? 'bg-secondary border-secondary' :
                        active ? 'bg-white border-secondary' :
                                 'bg-white border-outline-variant'
                      }`}>
                        {done && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                        {active && <div className="w-2 h-2 bg-secondary rounded-full" />}
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${done ? 'bg-secondary' : 'bg-outline-variant'}`} />
                      )}
                    </div>
                    <div className="pb-sm">
                      <p className={`text-body-sm font-semibold ${active ? 'text-secondary' : done ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                        {step}
                      </p>
                      {(done || active) && (
                        <p className="text-label-sm text-on-surface-variant">{detail.date}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {detail.tracking !== '—' && (
              <div className="mt-md pt-md border-t border-outline-variant/30">
                <p className="text-label-sm text-on-surface-variant mb-xs">Tracking Number</p>
                <p className="text-body-sm font-mono-data font-bold text-on-surface">{detail.tracking}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
