import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile, changePassword } from '../services/api'
import { User, Lock, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [info, setInfo] = useState({
    name: user?.name || '',
    contact_number: user?.contact_number || '',
    country: user?.country || '',
    city: user?.city || '',
  })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const handleInfo = async (e) => {
    e.preventDefault()
    setSavingInfo(true)
    try {
      const r = await updateProfile(info)
      updateUser(r.data)
      toast.success('Profile updated')
    } catch { toast.error('Failed to update') }
    finally { setSavingInfo(false) }
  }

  const handlePw = async (e) => {
    e.preventDefault()
    if (pw.newPassword !== pw.confirm) return toast.error('Passwords do not match')
    if (pw.newPassword.length < 6) return toast.error('Password must be at least 6 characters')
    setSavingPw(true)
    try {
      await changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword })
      toast.success('Password updated')
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    } finally { setSavingPw(false) }
  }

  return (
    <div className="max-w-xl space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-grey-200">
          <div className="w-14 h-14 rounded-full bg-red flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="font-bold text-navy text-base">{user?.name}</p>
            <p className="text-sm text-grey-500">{user?.email}</p>
            <div className="flex gap-2 mt-1">
              <span className="badge badge-grey capitalize">{user?.role}</span>
              <span className="badge badge-grey capitalize">{user?.type}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleInfo} className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-grey-500" />
            <h2 className="text-sm font-bold text-navy">Personal Info</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name</label>
              <input className="input" value={info.name} onChange={e => setInfo(i => ({ ...i, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Contact Number</label>
              <input className="input" value={info.contact_number} onChange={e => setInfo(i => ({ ...i, contact_number: e.target.value }))} />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" value={info.country} onChange={e => setInfo(i => ({ ...i, country: e.target.value }))} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={info.city} onChange={e => setInfo(i => ({ ...i, city: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingInfo}>
            <Save size={14} /> {savingInfo ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <form onSubmit={handlePw} className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={14} className="text-grey-500" />
            <h2 className="text-sm font-bold text-navy">Change Password</h2>
          </div>
          <div>
            <label className="label">Current Password</label>
            <input className="input" type="password" value={pw.currentPassword}
              onChange={e => setPw(p => ({ ...p, currentPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input className="input" type="password" value={pw.newPassword}
              onChange={e => setPw(p => ({ ...p, newPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input className="input" type="password" value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPw}>
            <Lock size={14} /> {savingPw ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
