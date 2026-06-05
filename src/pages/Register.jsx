import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', contact_number: '', country: '', city: ''
  })
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return toast.error('Name, email and password are required')
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red rounded-xl mb-4">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-navy">Create your account</h1>
          <p className="text-sm text-grey-500 mt-1">Join NipponBid to start buying cars from Japan</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Full name *</label>
                <input className="input" placeholder="John Smith" value={form.name} onChange={set('name')} />
              </div>
              <div className="col-span-2">
                <label className="label">Email address *</label>
                <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={set('email')} />
              </div>
              <div className="col-span-2">
                <label className="label">Password *</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={set('password')}
                  />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="+44 7700 000000" value={form.contact_number} onChange={set('contact_number')} />
              </div>
              <div>
                <label className="label">Country</label>
                <input className="input" placeholder="United Kingdom" value={form.country} onChange={set('country')} />
              </div>
              <div className="col-span-2">
                <label className="label">City</label>
                <input className="input" placeholder="Birmingham" value={form.city} onChange={set('city')} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-grey-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-red font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
