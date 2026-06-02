import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Car, Package, Truck, MapPin, Hash, Calendar, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPurchase, resolveImageUrl } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

const DOC_TYPE_LABELS = {
  auction_sheet: 'Auction Sheet',
  export_certificate: 'Export Certificate',
  bill_of_lading: 'Bill of Lading',
  inspection_report: 'Inspection Report',
  deregistration: 'Deregistration',
  customs_clearance: 'Customs Clearance',
  other: 'Document',
};

const SHIPPING_STEPS = ['processing', 'in_transit', 'at_port', 'customs', 'delivered'];
const SHIPPING_LABELS = { processing: 'Processing', in_transit: 'In Transit', at_port: 'At Port', customs: 'In Customs', delivered: 'Delivered' };

export default function PurchaseDetail() {
  const { id } = useParams();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    getPurchase(id).then(r => setPurchase(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner className="min-h-[60vh]" />;
  if (!purchase) return (
    <div className="page-container text-center py-20">
      <p className="text-gray-400">Purchase not found</p>
      <Link to="/my-purchases" className="btn-outline-gold mt-4">Back to Purchases</Link>
    </div>
  );

  const stepIdx = SHIPPING_STEPS.indexOf(purchase.shipping_status);
  const images = purchase.images || [];
  const docs = purchase.documents || [];

  return (
    <div className="page-container">
      <Link to="/my-purchases" className="inline-flex items-center gap-2 text-gray-500 hover:text-gold-400 text-sm mb-6">
        <ArrowLeft size={15} /> Back to Purchases
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{purchase.year} {purchase.make} {purchase.model}</h1>
          <p className="text-gray-500 mt-1">Purchase #{purchase.id} · {format(new Date(purchase.purchased_at), 'MMMM d, yyyy')}</p>
        </div>
        <StatusBadge status={purchase.shipping_status} type="shipping" />
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2"><Truck size={16} className="text-gold-500" /> Shipping Status</h2>
        <div className="relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-dark-500" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-gold-500 transition-all duration-700"
            style={{ width: `${Math.max(0, (stepIdx / (SHIPPING_STEPS.length - 1)) * 100)}%` }}
          />
          <div className="relative flex justify-between">
            {SHIPPING_STEPS.map((step, i) => (
              <div key={step} className={`flex flex-col items-center gap-2 ${i <= stepIdx ? 'text-gold-400' : 'text-gray-600'}`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${i < stepIdx ? 'bg-gold-500 border-gold-500 text-dark-50' : i === stepIdx ? 'border-gold-500 bg-gold-500/20' : 'border-dark-500 bg-dark-300'}`}>
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                <span className="text-xs text-center font-medium hidden sm:block">{SHIPPING_LABELS[step]}</span>
              </div>
            ))}
          </div>
        </div>
        {purchase.tracking_number && (
          <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-gray-600">Tracking</p><p className="text-white font-medium">{purchase.tracking_number}</p></div>
            {purchase.vessel_name && <div><p className="text-xs text-gray-600">Vessel</p><p className="text-white font-medium">{purchase.vessel_name}</p></div>}
            {purchase.eta && <div><p className="text-xs text-gray-600">ETA</p><p className="text-white font-medium">{format(new Date(purchase.eta), 'MMM d, yyyy')}</p></div>}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {images.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="relative aspect-video bg-dark-400">
                <img src={images[imgIdx]?.image_path} alt="" className="w-full h-full object-cover" />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"><ChevronLeft size={16} /></button>
                    <button onClick={() => setImgIdx(i => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"><ChevronRight size={16} /></button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setImgIdx(i)} className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 ${i === imgIdx ? 'border-gold-500' : 'border-transparent opacity-50'}`}>
                      <img src={img.image_path} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Car size={15} className="text-gold-500" /> Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Chassis #', purchase.chassis_number],
                ['Lot #', purchase.lot_number],
                ['Color', purchase.color],
                ['Mileage', purchase.mileage ? `${Number(purchase.mileage).toLocaleString()} km` : null],
                ['Grade', purchase.grade],
                ['Engine', purchase.engine],
                ['Transmission', purchase.transmission],
                ['Destination', purchase.destination_country],
                ['Destination Port', purchase.destination_port],
                ['Auction', purchase.auction_name],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="bg-dark-400 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                  <p className="text-white font-medium capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><FileText size={15} className="text-gold-500" /> Documents ({docs.length})</h3>
            {docs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No documents uploaded yet. Your documents will appear here once added by our team.</p>
            ) : (
              <div className="space-y-2">
                {docs.map(doc => (
                  <a key={doc.id} href={resolveImageUrl(doc.file_path)} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-dark-400 hover:bg-dark-500 transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-gold-500/10 border border-gold-500/15 flex items-center justify-center shrink-0">
                      <FileText size={15} className="text-gold-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-gray-500 text-xs">{DOC_TYPE_LABELS[doc.type] || doc.type} · {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</p>
                    </div>
                    <Download size={15} className="text-gray-600 group-hover:text-gold-400 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><DollarSign size={15} className="text-gold-500" /> Payment Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Vehicle Price</span><span className="text-white font-medium">¥{Number(purchase.final_amount).toLocaleString()}</span></div>
              {Number(purchase.shipping_fee) > 0 && <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span className="text-white">¥{Number(purchase.shipping_fee).toLocaleString()}</span></div>}
              {Number(purchase.insurance_fee) > 0 && <div className="flex justify-between"><span className="text-gray-500">Insurance</span><span className="text-white">¥{Number(purchase.insurance_fee).toLocaleString()}</span></div>}
              {Number(purchase.inspection_fee) > 0 && <div className="flex justify-between"><span className="text-gray-500">Inspection</span><span className="text-white">¥{Number(purchase.inspection_fee).toLocaleString()}</span></div>}
              <div className="border-t border-white/5 pt-3 flex justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className="text-gold-500 font-bold text-base">¥{Number(purchase.total_amount || purchase.final_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {purchase.bid_amount && (
            <div className="card p-5">
              <h3 className="text-white font-semibold mb-3 text-sm">Bid History</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Your Bid Amount</span>
                <span className="text-white">¥{Number(purchase.bid_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">Final Purchase Price</span>
                <span className="text-gold-400 font-semibold">¥{Number(purchase.final_amount).toLocaleString()}</span>
              </div>
            </div>
          )}

          {purchase.notes && (
            <div className="card p-5">
              <h3 className="text-white font-semibold mb-2 text-sm">Notes</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{purchase.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
