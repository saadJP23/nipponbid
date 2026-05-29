import React, { useState } from 'react';
import { User, Lock, Save, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COUNTRIES = ['United States','United Kingdom','Canada','Australia','Germany','France','Netherlands','Belgium','South Africa','Nigeria','Kenya','Pakistan','India','Bangladesh','UAE','Saudi Arabia','Qatar','Kuwait','Other'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', country: user?.country || '', city: user?.city || '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleProfileChange = (e) => setProfileForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handlePassChange = (e) => setPassForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name) return toast.error('Name is required');
    setLoading(true);
    try {
      const { data } = await updateProfile(profileForm);
      updateUser(data);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) return toast.error('Passwords do not match');
    if (passForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password changed!');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: '100%' }}>
      <div className="page-container max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ae-ink)' }}>Account Settings</h1>
          <p className="mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Manage your profile and security</p>
        </div>

        <div className="card p-5 flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(183,16,42,0.10)', border: '1px solid rgba(183,16,42,0.20)' }}>
            <span className="font-black text-2xl" style={{ color: 'var(--ae-red)' }}>{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: 'var(--ae-ink)' }}>{user?.name}</p>
            <p className="text-sm" style={{ color: 'var(--ae-ink-muted)' }}>{user?.email}</p>
            {user?.created_at && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ae-ink-faint)' }}>
                Member since {format(new Date(user.created_at), 'MMMM yyyy')}
              </p>
            )}
          </div>
          {user?.role === 'admin' && (
            <span className="ml-auto badge flex items-center gap-1"
              style={{ background: 'rgba(139,92,246,0.10)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.20)' }}>
              <Shield size={11} /> Admin
            </span>
          )}
        </div>

        <div className="flex gap-1 mb-6 rounded-xl p-1" style={{ background: 'var(--ae-glass-bg)', border: '1px solid var(--ae-glass-border)' }}>
          <button
            onClick={() => setTab('profile')}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === 'profile'
              ? { background: 'var(--ae-red)', color: '#fff' }
              : { color: 'var(--ae-ink-muted)' }}>
            <span className="flex items-center justify-center gap-2"><User size={14} /> Profile</span>
          </button>
          <button
            onClick={() => setTab('password')}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === 'password'
              ? { background: 'var(--ae-red)', color: '#fff' }
              : { color: 'var(--ae-ink-muted)' }}>
            <span className="flex items-center justify-center gap-2"><Lock size={14} /> Password</span>
          </button>
        </div>

        {tab === 'profile' ? (
          <form onSubmit={handleProfileSave} className="card p-6 space-y-4">
            <div>
              <label className="label">Full Name *</label>
              <input type="text" name="name" value={profileForm.name} onChange={handleProfileChange} className="input-field" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" value={user?.email} disabled className="input-field opacity-50 cursor-not-allowed" />
              <p className="text-xs mt-1" style={{ color: 'var(--ae-ink-faint)' }}>Email cannot be changed</p>
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input type="tel" name="phone" value={profileForm.phone} onChange={handleProfileChange} placeholder="+1 234 567 8900" className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Country</label>
                <select name="country" value={profileForm.country} onChange={handleProfileChange} className="select-field">
                  <option value="">Select country...</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">City</label>
                <input type="text" name="city" value={profileForm.city} onChange={handleProfileChange} placeholder="Your city" className="input-field" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 mt-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Save size={16} /> Save Changes</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSave} className="card p-6 space-y-4">
            <div>
              <label className="label">Current Password *</label>
              <input type="password" name="currentPassword" value={passForm.currentPassword} onChange={handlePassChange} placeholder="••••••••" className="input-field" />
            </div>
            <div>
              <label className="label">New Password *</label>
              <input type="password" name="newPassword" value={passForm.newPassword} onChange={handlePassChange} placeholder="Min 6 characters" className="input-field" />
            </div>
            <div>
              <label className="label">Confirm New Password *</label>
              <input type="password" name="confirmPassword" value={passForm.confirmPassword} onChange={handlePassChange} placeholder="Repeat new password" className="input-field" />
              {passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 mt-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Lock size={16} /> Change Password</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
