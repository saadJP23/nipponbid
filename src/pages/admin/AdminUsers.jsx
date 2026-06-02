import React, { useEffect, useState } from 'react';
import {
  Users, Search, ToggleLeft, ToggleRight, Send, X,
  ChevronRight, Mail, Phone, MapPin, Calendar,
  Gavel, ShoppingBag, BookOpen, Edit2, Check, Download, Car, UserPlus, Eye, EyeOff,
} from 'lucide-react';
import {
  getAdminUsers, getAdminUser, createAdminUser, updateAdminUser, toggleUser, sendNotification,
  getAllJapanPurchases, adminDownloadAccountExcel, resolveImageUrl,
} from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function UserDrawer({ userId, onClose, onUpdated }) {
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('profile');
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      getAdminUser(userId),
      getAllJapanPurchases({ user_id: userId, limit: 100 }),
    ]).then(([uRes, pRes]) => {
      setUser(uRes.data);
      setPurchases(pRes.data?.purchases || []);
      setForm({ name: uRes.data.name, email: uRes.data.email, phone: uRes.data.phone || '', country: uRes.data.country || '', city: uRes.data.city || '' });
    }).catch(() => toast.error('Failed to load user'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminUser(userId, form);
      toast.success('Profile updated');
      setEditing(false);
      const r = await getAdminUser(userId);
      setUser(r.data);
      onUpdated?.();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleToggle = async () => {
    try {
      await toggleUser(userId);
      const r = await getAdminUser(userId);
      setUser(r.data);
      toast.success(r.data.is_active ? 'User activated' : 'User deactivated');
      onUpdated?.();
    } catch { toast.error('Failed'); }
  };

  const handleDownloadExcel = async () => {
    setExporting(true);
    try {
      const res = await adminDownloadAccountExcel(userId);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `account-${user?.name?.replace(/\s+/g,'-')}-${Date.now()}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const amountDue = user?.balance < 0 ? Math.abs(user.balance) : 0;
  const hasCredit = user?.balance > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full max-w-lg overflow-y-auto flex flex-col" style={{ background: 'var(--ae-surface)', borderLeft: '1px solid var(--ae-glass-border)' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--ae-glass-border)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--ae-ink)' }}>User Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--ae-ink-faint)' }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Loading…</div>
          </div>
        ) : !user ? (
          <div className="flex-1 flex items-center justify-center">
            <p style={{ color: 'var(--ae-ink-faint)' }}>User not found</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--ae-glass-border)' }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
                  style={{ background: 'var(--ae-red)' }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold truncate" style={{ color: 'var(--ae-ink)' }}>{user.name}</h3>
                  <p className="text-sm truncate" style={{ color: 'var(--ae-ink-muted)' }}>{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={user.is_active ? 'badge-green' : 'badge-red'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>
                      Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Bids', value: (user.total_bids || 0) + (user.total_japan_bids || 0) },
                  { label: 'Purchases', value: (user.total_purchases || 0) + (user.total_japan_purchases || 0) },
                  {
                    label: hasCredit ? 'Credit' : 'Due',
                    value: hasCredit ? `+¥${Number(user.balance).toLocaleString()}` : amountDue > 0 ? `¥${Number(amountDue).toLocaleString()}` : '¥0',
                    color: hasCredit ? '#34d399' : amountDue > 0 ? '#f87171' : undefined,
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card p-2.5 text-center">
                    <p className="text-sm font-bold" style={{ color: color || 'var(--ae-ink)' }}>{value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ae-ink-faint)' }}>{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--ae-glass-bg)' }}>
                {[['profile','Profile'], ['purchases','Purchases']].map(([v, l]) => (
                  <button key={v} onClick={() => setTab(v)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: tab === v ? 'var(--ae-surface)' : 'transparent', color: tab === v ? 'var(--ae-ink)' : 'var(--ae-ink-faint)' }}>
                    {l} {v === 'purchases' && purchases.length > 0 ? `(${purchases.length})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-6 space-y-5 overflow-y-auto">

              {tab === 'profile' && (
                <>
                  <div className="card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ae-ink-faint)' }}>
                        {editing ? 'Edit Profile' : 'Profile Info'}
                      </h4>
                      <button onClick={() => setEditing(e => !e)}
                        className="p-1.5 rounded-lg hover:opacity-70"
                        style={{ color: editing ? 'var(--ae-red)' : 'var(--ae-ink-faint)' }}>
                        {editing ? <X size={14} /> : <Edit2 size={14} />}
                      </button>
                    </div>
                    {editing ? (
                      <div className="space-y-3">
                        {[
                          { label: 'Full Name', key: 'name',    type: 'text'  },
                          { label: 'Email',     key: 'email',   type: 'email' },
                          { label: 'Phone',     key: 'phone',   type: 'tel'   },
                          { label: 'Country',   key: 'country', type: 'text'  },
                          { label: 'City',      key: 'city',    type: 'text'  },
                        ].map(({ label, key, type }) => (
                          <div key={key}>
                            <label className="label">{label}</label>
                            <input type={type} className="input-field text-sm"
                              value={form[key] || ''}
                              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                          </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setEditing(false)} className="btn-ghost text-sm flex-1 justify-center">Cancel</button>
                          <button onClick={handleSave} disabled={saving} className="btn-gold text-sm flex-1 justify-center gap-1.5">
                            {saving ? 'Saving…' : <><Check size={13} /> Save</>}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { icon: Mail,    label: 'Email',    value: user.email },
                          { icon: Phone,   label: 'Phone',    value: user.phone || '—' },
                          { icon: MapPin,  label: 'Location', value: [user.city, user.country].filter(Boolean).join(', ') || '—' },
                          { icon: Calendar,label: 'Joined',   value: format(new Date(user.created_at), 'MMMM d, yyyy') },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="flex items-start gap-3">
                            <Icon size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--ae-ink-faint)' }} />
                            <div>
                              <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{label}</p>
                              <p className="text-sm" style={{ color: 'var(--ae-ink)' }}>{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card p-5 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ae-ink-faint)' }}>Actions</h4>
                    <button onClick={handleToggle}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                        ${user.is_active ? 'text-red-400 hover:bg-red-500/8' : 'text-emerald-400 hover:bg-emerald-500/8'}`}
                      style={{ border: '1px solid var(--ae-glass-border)' }}>
                      {user.is_active ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                      {user.is_active ? 'Deactivate Account' : 'Activate Account'}
                    </button>
                    <a href="/admin/accounting"
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/4"
                      style={{ border: '1px solid var(--ae-glass-border)', color: 'var(--ae-ink-muted)', textDecoration: 'none' }}>
                      <BookOpen size={16} style={{ color: 'var(--ae-ink-faint)' }} />
                      View Full Ledger
                      <ChevronRight size={14} className="ml-auto" />
                    </a>
                  </div>
                </>
              )}

              {tab === 'purchases' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--ae-ink-faint)' }}>
                      Japan Purchases ({purchases.length})
                    </h4>
                    <button onClick={handleDownloadExcel} disabled={exporting || !purchases.length}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                      style={{ background: 'var(--ae-glass-bg)', color: 'var(--ae-ink-muted)', border: '1px solid var(--ae-glass-border)' }}>
                      <Download size={11} /> {exporting ? 'Exporting…' : 'Account Excel'}
                    </button>
                  </div>

                  {purchases.length === 0 ? (
                    <div className="card p-10 text-center">
                      <Car size={28} className="mx-auto mb-3" style={{ color: 'var(--ae-ink-faint)' }} />
                      <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>No purchases yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {purchases.map(p => (
                        <a key={p.id} href="/admin/japan-purchases"
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/4 transition-colors"
                          style={{ border: '1px solid var(--ae-glass-border)', textDecoration: 'none' }}>
                          {p.image_url ? (
                            <img src={resolveImageUrl(p.image_url.split(',')[0].trim())} alt=""
                              className="w-10 h-8 rounded-lg object-cover shrink-0"
                              onError={e => e.target.style.display='none'} />
                          ) : (
                            <div className="w-10 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--ae-glass-bg)' }}>
                              <Car size={11} style={{ color: 'var(--ae-ink-faint)' }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--ae-ink)' }}>
                              {p.year} {p.make} {p.model}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>
                              {p.file_code || p.chassis || '—'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold" style={{ color: p.total > 0 ? '#34d399' : 'var(--ae-ink-faint)' }}>
                              {p.total > 0 ? `¥${Number(p.total).toLocaleString()}` : '—'}
                            </p>
                            {p.bl_status && <span className="text-xs" style={{ color: 'var(--ae-ink-faint)' }}>{p.bl_status}</span>}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users,        setUsers]        = useState([]);
  const [total,        setTotal]        = useState(0);
  const [pages,        setPages]        = useState(1);
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notifyModal,  setNotifyModal]  = useState(false);
  const [notifyForm,   setNotifyForm]   = useState({ user_id: 'all', title: '', message: '', type: 'general' });
  const [sending,      setSending]      = useState(false);
  const [createModal,  setCreateModal]  = useState(false);
  const [createForm,   setCreateForm]   = useState({ name: '', email: '', password: '', phone: '', country: '', city: '', role: 'user' });
  const [showPw,       setShowPw]       = useState(false);
  const [creating,     setCreating]     = useState(false);

  const load = () => {
    setLoading(true);
    getAdminUsers({ search: search || undefined, page, limit: 15 })
      .then(r => { setUsers(r.data.users || []); setTotal(r.data.total); setPages(r.data.pages); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search]);

  const handleNotify = async () => {
    if (!notifyForm.title || !notifyForm.message) return toast.error('Title and message required');
    setSending(true);
    try {
      await sendNotification(notifyForm);
      toast.success('Notification sent!');
      setNotifyModal(false);
      setNotifyForm({ user_id: 'all', title: '', message: '', type: 'general' });
    } catch { toast.error('Failed'); } finally { setSending(false); }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) return toast.error('Name, email and password are required');
    setCreating(true);
    try {
      await createAdminUser(createForm);
      toast.success('User created successfully');
      setCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', phone: '', country: '', city: '', role: 'user' });
      setShowPw(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create user'); }
    finally { setCreating(false); }
  };

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100vh' }} className="px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--ae-ink)' }}>Users</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--ae-ink-muted)' }}>{total} user{total !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCreateModal(true)} className="btn-gold text-sm gap-2">
              <UserPlus size={14} /> Add User
            </button>
            <button onClick={() => setNotifyModal(true)} className="btn-ghost text-sm gap-2">
              <Send size={14} /> Notify
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ae-ink-faint)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, country…" className="input-field pl-10" />
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : users.length === 0 ? (
          <div className="card text-center py-20">
            <Users size={48} className="mx-auto mb-4" style={{ color: 'var(--ae-ink-faint)' }} />
            <p style={{ color: 'var(--ae-ink-muted)' }}>No users found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <button key={user.id} onClick={() => setSelectedUser(user.id)}
                className="w-full card p-4 flex items-center gap-4 text-left hover:border-white/15 transition-all"
                style={{ opacity: user.is_active ? 1 : 0.5 }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-semibold text-sm"
                  style={{ background: 'var(--ae-red)' }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--ae-ink)' }}>{user.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--ae-ink-faint)' }}>
                    {user.email} · {user.country || 'Unknown'}
                  </p>
                </div>

                <div className="hidden sm:flex gap-4 text-xs shrink-0" style={{ color: 'var(--ae-ink-muted)' }}>
                  <span>{user.total_bids} bids</span>
                  <span>{user.total_purchases} purchases</span>
                  <span>Joined {format(new Date(user.created_at), 'MMM yyyy')}</span>
                </div>

                <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--ae-ink-faint)' }} />
              </button>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost disabled:opacity-30 text-sm">← Prev</button>
            <span className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>Page {page} of {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost disabled:opacity-30 text-sm">Next →</button>
          </div>
        )}
      </div>

      {selectedUser && (
        <UserDrawer
          userId={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdated={load}
        />
      )}

      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateModal(false)} />
          <div className="relative card p-6 w-full max-w-md" style={{ background: 'var(--ae-surface)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--ae-ink)' }}>Add New User</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ae-ink-faint)' }}>Create an account on behalf of a client</p>
              </div>
              <button onClick={() => setCreateModal(false)} style={{ color: 'var(--ae-ink-faint)' }} className="hover:opacity-70 p-1.5"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Full Name *</label>
                <input type="text" className="input-field" placeholder="John Smith"
                  value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input-field" placeholder="john@example.com"
                  value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input-field pr-10" placeholder="Min. 6 characters"
                    value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                    style={{ color: 'var(--ae-ink-faint)' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" className="input-field" placeholder="+81 90-0000-0000"
                    value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input type="text" className="input-field" placeholder="Japan"
                    value={createForm.country} onChange={e => setCreateForm(f => ({ ...f, country: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">City</label>
                <input type="text" className="input-field" placeholder="Tokyo"
                  value={createForm.city} onChange={e => setCreateForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="select-field" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="user">User (Client)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setCreateModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="btn-gold flex-1 justify-center gap-2">
                {creating ? 'Creating…' : <><UserPlus size={14} /> Create User</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {notifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNotifyModal(false)} />
          <div className="relative card p-6 w-full max-w-md" style={{ background: 'var(--ae-surface)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold" style={{ color: 'var(--ae-ink)' }}>Send Notification</h3>
              <button onClick={() => setNotifyModal(false)} style={{ color: 'var(--ae-ink-faint)' }} className="hover:opacity-70"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Send To</label>
                <select value={notifyForm.user_id} onChange={e => setNotifyForm(f => ({ ...f, user_id: e.target.value }))} className="select-field">
                  <option value="all">All Users</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Type</label>
                <select value={notifyForm.type} onChange={e => setNotifyForm(f => ({ ...f, type: e.target.value }))} className="select-field">
                  {['general','bid','purchase','parts','document'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div><label className="label">Title *</label><input type="text" value={notifyForm.title} onChange={e => setNotifyForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title" className="input-field" /></div>
              <div><label className="label">Message *</label><textarea value={notifyForm.message} onChange={e => setNotifyForm(f => ({ ...f, message: e.target.value }))} rows={3} placeholder="Notification message…" className="input-field resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setNotifyModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleNotify} disabled={sending} className="btn-gold flex-1 justify-center">
                {sending ? '…' : <><Send size={14} /> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
