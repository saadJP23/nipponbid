import React, { useState, useCallback } from 'react';
import {
  Search, Languages, Loader2, AlertCircle, Star,
  ExternalLink, X, Copy, Check, SlidersHorizontal,
} from 'lucide-react';
import api from '../services/api';
import { useTranslate } from '../hooks/useTranslate';

const USD_RATE = 155;
const toUSD  = (yen) => yen ? `USD ${Math.round(yen / USD_RATE).toLocaleString()}` : null;
const fmtYen = (n)   => n != null ? `¥${Number(n).toLocaleString()}` : '—';

const MAKES = [
  { en: 'Toyota',  ja: 'トヨタ' }, { en: 'Nissan',  ja: '日産' },
  { en: 'Honda',   ja: 'ホンダ' }, { en: 'Mazda',   ja: 'マツダ' },
  { en: 'Daihatsu',ja: 'ダイハツ'},{ en: 'Subaru',  ja: 'スバル' },
];
const SORT_OPTIONS = [
  { value: '',       en: 'Relevance',   ja: '関連度' },
  { value: '-price', en: 'Price ↓',     ja: '価格 ↓' },
  { value: '+price', en: 'Price ↑',     ja: '価格 ↑' },
  { value: 'bids',   en: 'Most Bids',   ja: '最多入札' },
  { value: 'end',    en: 'Ending Soon', ja: '終了が近い' },
];

function formatEnd(endTime) {
  if (!endTime) return null;
  const diff = new Date(endTime) - Date.now();
  if (diff < 0) return 'Ended';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}日 ${h % 24}時間`;
  return `${h}時間${Math.floor((diff % 3600000) / 60000)}分`;
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
      }`}>
      {children}
    </button>
  );
}

function FilterSection({ label, labelJa, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-white/30 text-[9px] font-bold tracking-[0.15em] uppercase">
        {label} / {labelJa}
      </div>
      {children}
    </div>
  );
}

const CONDITION_STYLES = {
  new:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  unused: 'bg-sky-500/15     text-sky-400     border-sky-500/25',
  used:   'bg-amber-500/15   text-amber-400   border-amber-500/25',
};
const CONDITION_LABELS = {
  new:    'New / 新品', unused: 'Unused / 未使用', used: 'Used / 中古',
};

function CondBadge({ condition }) {
  if (!condition || !CONDITION_STYLES[condition]) return null;
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${CONDITION_STYLES[condition]}`}>
      {CONDITION_LABELS[condition]}
    </span>
  );
}

function SrcBadge({ type }) {
  return type === 'auction'
    ? <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-red-500/20 text-red-400 border border-red-500/25">Auction</span>
    : <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/25">Shopping</span>;
}

function ProductCard({ item, lang, onDetail, onAsk }) {
  const [imgErr, setImgErr] = useState(false);
  const isAuction = item.type === 'auction';
  const usd       = toUSD(item.price);
  const end       = formatEnd(item.endTime);

  return (
    <div className="card flex flex-col overflow-hidden group" style={{ boxShadow: 'inset 0 0 0 1px var(--ae-glass-border)' }}>
      <div className="relative overflow-hidden bg-black/40" style={{ aspectRatio: '1/1' }}>
        {item.image && !imgErr
          ? <img src={item.image} alt={item.title} onError={() => setImgErr(true)}
              className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center text-white/10 text-5xl">
              {isAuction ? '🔨' : '🛍'}
            </div>
        }
        <div className="absolute top-2 left-2"><SrcBadge type={item.type} /></div>
        <div className="absolute top-2 right-2"><CondBadge condition={item.condition} /></div>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-white/80 text-xs font-medium line-clamp-2 leading-relaxed flex-1">
          {item.title}
        </p>

        <div>
          <div className="text-red-400 font-bold text-sm">{fmtYen(item.price)}</div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-[10px] text-white/30">
            {usd && <span>{usd}</span>}
            {isAuction && item.bids != null && <><span>·</span><span>{item.bids} bids</span></>}
            {isAuction && end && <><span>·</span><span>Ends: {end}</span></>}
            {!isAuction && item.freeShipping && <><span>·</span><span className="text-emerald-400/70">Free / 送料無料</span></>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/30">
          {item.rating > 0 && (
            <span className="flex items-center gap-0.5 text-yellow-400/70">
              <Star size={9} className="fill-yellow-400/70" />{item.rating.toFixed(1)}
            </span>
          )}
          {item.seller && <span className="truncate max-w-[120px]">{item.seller}</span>}
        </div>

        <div className="flex gap-1.5 pt-1">
          <button onClick={() => onDetail(item)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-medium liquid-glass text-white/60 hover:text-white transition-colors">
            {lang === 'EN' ? 'View details' : '詳細を見る'}
          </button>
          <button onClick={() => onAsk(item)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors">
            {lang === 'EN' ? 'Ask seller' : '売り手に質問'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AskSellerModal({ item, onClose }) {
  const { translate, loading } = useTranslate();
  const [input,  setInput]  = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  const handleTranslate = async () => {
    const ja = await translate(input, { from: 'EN', to: 'JA' });
    if (ja) setResult(ja);
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md liquid-glass rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-semibold text-sm">Ask Seller / 売り手に質問</h3>
            <p className="text-white/30 text-xs mt-0.5 line-clamp-1">{item.title}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <textarea value={input} onChange={e => setInput(e.target.value)} rows={3}
          placeholder="Type your question in English…"
          className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 resize-none" />

        <button onClick={handleTranslate} disabled={loading || !input.trim()}
          className="btn-primary py-2 rounded-xl text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
          Translate to Japanese / 日本語に翻訳
        </button>

        {result && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-400 text-xs font-medium">日本語訳</span>
              <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
                {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailPanel({ item, lang, onClose }) {
  const { translate, loading: translating } = useTranslate();
  const [translated, setTranslated] = useState(null);
  const isAuction = item.type === 'auction';
  const end = formatEnd(item.endTime);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:w-[420px] max-h-[90vh] md:max-h-none overflow-y-auto liquid-glass border-t md:border-t-0 md:border-l border-white/10 p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <p className="text-white font-semibold text-sm leading-snug flex-1">{item.title}</p>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors shrink-0"><X size={16} /></button>
        </div>

        {item.image && (
          <div className="rounded-xl overflow-hidden bg-black/30" style={{ aspectRatio: '1/1' }}>
            <img src={item.image} alt={item.title} className="w-full h-full object-contain p-4" />
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <SrcBadge type={item.type} />
          <CondBadge condition={item.condition} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-red-400 font-bold text-xl">{fmtYen(item.price)}</div>
            <div className="text-white/30 text-xs mt-0.5">{toUSD(item.price)}</div>
          </div>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              {lang === 'EN' ? 'View on Yahoo' : 'Yahooで見る'} <ExternalLink size={11} />
            </a>
          )}
        </div>

        {isAuction && (
          <div className="grid grid-cols-2 gap-2">
            {[['Bids / 入札', item.bids ?? '0'], ['Ends / 終了', end || '—']].map(([label, val]) => (
              <div key={label} className="liquid-glass rounded-xl p-3">
                <div className="text-white/30 text-[10px] mb-0.5">{label}</div>
                <div className="text-white/80 text-sm font-medium">{val}</div>
              </div>
            ))}
          </div>
        )}

        {!isAuction && item.rating > 0 && (
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={14} className={i < Math.round(item.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'} />
            ))}
            <span className="text-white/50 text-sm">{item.rating.toFixed(1)}</span>
            {item.reviewCount > 0 && <span className="text-white/25 text-xs">({item.reviewCount.toLocaleString()})</span>}
          </div>
        )}

        {item.seller && (
          <div className="text-white/30 text-xs">
            {lang === 'EN' ? 'Seller' : '出品者'}: <span className="text-white/60">{item.seller}</span>
          </div>
        )}

        {item.title && (
          <div className="liquid-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/40 text-xs">{lang === 'EN' ? 'Title translation' : 'タイトル翻訳'}</span>
              <button onClick={async () => setTranslated(await translate(item.title, { from: 'JA', to: 'EN' }))}
                disabled={translating}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors">
                {translating ? <Loader2 size={10} className="animate-spin" /> : <Languages size={10} />}
                EN
              </button>
            </div>
            <p className="text-white/70 text-xs leading-relaxed">{translated || item.title}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const HITS = 20;
const INIT_FILTERS = {
  source: 'all', condition: 'all', priceMin: '', priceMax: '',
  make: 'all', auctionEnd: 'any', shipping: 'all', sort: '',
};

export default function YahooMarketplace() {
  const [lang,      setLang]      = useState('EN');
  const [inputVal,  setInputVal]  = useState('');
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [sources,   setSources]   = useState(null);
  const [page,      setPage]      = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [selected,  setSelected]  = useState(null);
  const [askItem,   setAskItem]   = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters,   setFilters]   = useState(INIT_FILTERS);

  const { translate } = useTranslate();
  const t = (en, ja) => lang === 'EN' ? en : ja;

  const doSearch = useCallback(async (q, f, p = 1) => {
    if (!q?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let searchQ = q;
      if (f.make !== 'all') searchQ = `${f.make} ${q}`;

      const { data } = await api.get('/yahoo/search', {
        params: {
          q: searchQ,
          type:        f.source !== 'all' ? f.source : undefined,
          page:        p,
          hits:        HITS,
          sort:        f.sort || undefined,
          priceFrom:   f.priceMin || undefined,
          priceTo:     f.priceMax || undefined,
          condition:   f.condition !== 'all' ? f.condition : undefined,
          freeShipping: f.shipping === 'free' ? 1 : undefined,
        },
      });
      setResults(data.results || []);
      setTotal(data.total || 0);
      setSources(data.sources || null);
      setPage(p);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!inputVal.trim()) return;
    let q = inputVal.trim();
    if (/^[\x00-\x7F]+$/.test(q)) {
      try {
        const ja = await translate(q, { from: 'EN', to: 'JA' });
        if (ja) q = ja;
      } catch {}
    }
    setQuery(q);
    setActiveTab('all');
    doSearch(q, filters, 1);
  };

  const applyFilter = (key, val) => {
    const next = { ...filters, [key]: val };
    setFilters(next);
    if (query) doSearch(query, next, 1);
  };

  const visibleResults = activeTab === 'all' ? results
    : results.filter(r => r.type === (activeTab === 'auctions' ? 'auction' : 'shopping'));

  const aucCount  = results.filter(r => r.type === 'auction').length;
  const shopCount = results.filter(r => r.type === 'shopping').length;

  const SidebarContent = () => (
    <div className="flex flex-col gap-5 p-4">
      <FilterSection label="SOURCE" labelJa="ソース">
        {[['all','All','すべて'],['auctions','Auction','オークション'],['shopping','Shopping','ショッピング']].map(([v,en,ja]) => (
          <Pill key={v} active={filters.source===v} onClick={() => applyFilter('source',v)}>{t(en,ja)}</Pill>
        ))}
      </FilterSection>

      <FilterSection label="CONDITION" labelJa="状態">
        {[['all','All','すべて'],['new','New','新品'],['used','Used','中古'],['oem','OEM','純正'],['aftermarket','Aftermarket','社外']].map(([v,en,ja]) => (
          <Pill key={v} active={filters.condition===v} onClick={() => applyFilter('condition',v)}>{t(en,ja)}</Pill>
        ))}
      </FilterSection>

      <FilterSection label="PRICE" labelJa="価格 (¥)">
        <div className="flex items-center gap-1.5">
          <input value={filters.priceMin} onChange={e => setFilters(f => ({...f, priceMin: e.target.value}))}
            onBlur={() => query && doSearch(query, filters, 1)}
            placeholder="Min" className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-blue-500/40" />
          <span className="text-white/20 text-xs shrink-0">–</span>
          <input value={filters.priceMax} onChange={e => setFilters(f => ({...f, priceMax: e.target.value}))}
            onBlur={() => query && doSearch(query, filters, 1)}
            placeholder="Max" className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-blue-500/40" />
        </div>
      </FilterSection>

      <FilterSection label="MAKE" labelJa="メーカー">
        <Pill active={filters.make==='all'} onClick={() => applyFilter('make','all')}>{t('All','すべて')}</Pill>
        {MAKES.map(m => (
          <Pill key={m.en} active={filters.make===m.en} onClick={() => applyFilter('make',m.en)}>
            {t(m.en, m.ja)}
          </Pill>
        ))}
      </FilterSection>

      <FilterSection label="AUCTION END" labelJa="終了">
        {[['any','Any','すべて'],['24h','24h','24時間'],['3d','3 days','3日'],['7d','7 days','7日']].map(([v,en,ja]) => (
          <Pill key={v} active={filters.auctionEnd===v} onClick={() => applyFilter('auctionEnd',v)}>{t(en,ja)}</Pill>
        ))}
      </FilterSection>

      <FilterSection label="SHIPPING" labelJa="送料">
        {[['all','All','すべて'],['free','Free','送料無料']].map(([v,en,ja]) => (
          <Pill key={v} active={filters.shipping===v} onClick={() => applyFilter('shipping',v)}>{t(en,ja)}</Pill>
        ))}
      </FilterSection>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 md:top-[80px] z-30 border-b border-white/5 px-4 py-2.5"
        style={{ background: 'var(--ae-canvas)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="hidden sm:block text-white/30 text-xs shrink-0 font-medium tracking-wide">
            Yahoo Japan Marketplace
          </span>

          <form onSubmit={handleSubmit} className="flex-1 flex gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
              <input value={inputVal} onChange={e => setInputVal(e.target.value)}
                placeholder={t('Search products… (auto-translated)','商品を検索…')}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-blue-500/50" />
            </div>
            <button type="submit" disabled={loading || !inputVal.trim()}
              className="btn-primary px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-40 flex items-center gap-1.5 shrink-0">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              {t('Search','検索')}
            </button>
          </form>

          <div className="flex items-center liquid-glass rounded-full p-0.5 gap-0.5 shrink-0">
            {[['EN','EN'],['JA','日本語']].map(([val,label]) => (
              <button key={val} onClick={() => setLang(val)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${lang===val ? 'bg-white/15 text-white' : 'text-white/35 hover:text-white/70'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 flex gap-5">
        <aside className="hidden md:block w-52 shrink-0">
          <div className="liquid-glass rounded-2xl sticky top-[136px]">
            <SidebarContent />
          </div>
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-64 liquid-glass overflow-y-auto">
              <div className="flex items-center justify-between px-4 pt-4 pb-0">
                <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">Filters</span>
                <button onClick={() => setSidebarOpen(false)} className="text-white/30 hover:text-white/70"><X size={16} /></button>
              </div>
              <SidebarContent />
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {(results.length > 0 || loading) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setSidebarOpen(true)}
                  className="md:hidden liquid-glass p-1.5 rounded-lg text-white/40 hover:text-white/70">
                  <SlidersHorizontal size={13} />
                </button>
                {results.length > 0 && (
                  <span className="text-white/40 text-xs">
                    {t(`Showing ${visibleResults.length} of ${total.toLocaleString()} results`,
                       `${total.toLocaleString()}件中 ${visibleResults.length}件表示`)}
                    {inputVal && <> {t('for','の')}{' '}<span className="text-white/70">"{inputVal}"</span></>}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select value={filters.sort} onChange={e => applyFilter('sort', e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/60 focus:outline-none focus:border-blue-500/40 appearance-none cursor-pointer">
                  {SORT_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.en} / {s.ja}</option>
                  ))}
                </select>

                <div className="flex liquid-glass rounded-xl p-0.5 gap-px">
                  {[['all','All','すべて'],['auctions','Auction','オークション'],['shopping','Shopping','ショッピング']].map(([v,en,ja]) => (
                    <button key={v} onClick={() => setActiveTab(v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
                        activeTab===v ? 'bg-white/15 text-white' : 'text-white/35 hover:text-white/60'}`}>
                      {t(en,ja)}
                      {v !== 'all' && results.length > 0 && (
                        <span className="text-white/25 text-[9px]">{v==='auctions' ? aucCount : shopCount}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sources?.auctions && sources.auctions !== 'ok' && !loading && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400/80 text-xs">
              <AlertCircle size={12} />
              {t('Yahoo Auction API is unavailable for this App ID — showing Shopping results only.',
                 'Yahoo オークション API は利用できません。ショッピングの結果のみ表示しています。')}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={14} />{error}
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="bg-white/5" style={{ aspectRatio: '1/1' }} />
                  <div className="p-3 space-y-2">
                    <div className="h-2.5 bg-white/5 rounded w-full" />
                    <div className="h-2.5 bg-white/5 rounded w-3/4" />
                    <div className="h-4 bg-white/5 rounded w-1/3 mt-3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && visibleResults.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleResults.map((item, i) => (
                <ProductCard key={item.id || i} item={item} lang={lang}
                  onDetail={setSelected} onAsk={setAskItem} />
              ))}
            </div>
          )}

          {!loading && total > HITS && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => doSearch(query, filters, page - 1)}
                className="liquid-glass px-4 py-2 rounded-xl text-xs text-white/50 hover:text-white/80 disabled:opacity-30 transition-colors">
                {t('Previous','前へ')}
              </button>
              <span className="text-white/30 text-xs px-2">{t(`Page ${page}`,'ページ '+ page)}</span>
              <button disabled={page * HITS >= total} onClick={() => doSearch(query, filters, page + 1)}
                className="liquid-glass px-4 py-2 rounded-xl text-xs text-white/50 hover:text-white/80 disabled:opacity-30 transition-colors">
                {t('Next','次へ')}
              </button>
            </div>
          )}

          {!loading && !error && results.length === 0 && query && (
            <div className="text-center py-16 text-white/25">
              <p className="text-sm">{t('No results for','検索結果なし：')} "{inputVal}"</p>
            </div>
          )}

          {!loading && !error && results.length === 0 && !query && (
            <div className="text-center py-20">
              <Search size={44} className="mx-auto mb-4 text-white/8" />
              <p className="text-white/20 text-sm">{t('Search for any product in English or Japanese','英語または日本語で商品を検索')}</p>
              <p className="text-white/10 text-xs mt-1.5">{t('English queries are auto-translated','英語のクエリは自動的に翻訳されます')}</p>
            </div>
          )}
        </main>
      </div>

      {askItem  && <AskSellerModal item={askItem}  onClose={() => setAskItem(null)} />}
      {selected && <DetailPanel   item={selected} lang={lang} onClose={() => setSelected(null)} />}
    </div>
  );
}
