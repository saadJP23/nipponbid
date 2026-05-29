import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { register as registerApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const COUNTRIES = ['United States','United Kingdom','Canada','Australia','Germany','France','Netherlands','Belgium','South Africa','Nigeria','Kenya','Pakistan','India','Bangladesh','UAE','Saudi Arabia','Qatar','Kuwait','Other'];

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', country: '', city: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Name, email and password are required');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { data } = await registerApi(form);
      login(data.token, data.user);
      toast.success('Account created! Welcome to NipponBid.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: 'calc(100vh - 64px)' }}
      className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <img src="/logo.svg" alt="NipponBid" className="h-10 w-10 object-contain" />
            <span className="font-bold text-2xl" style={{ color: 'var(--ae-ink)' }}>
              Nippon<span style={{ color: 'var(--ae-red)' }}>Bid</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ae-ink)' }}>Create Your Account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Start sourcing Japanese vehicles today</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Full Name *</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="John Smith" className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="label">Email Address *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="label">Password *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="input-field pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--ae-ink-faint)' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 234 567 8900" className="input-field" />
              </div>
              <div>
                <label className="label">City</label>
                <input type="text" name="city" value={form.city} onChange={handleChange} placeholder="Your city" className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="label">Country</label>
                <select name="country" value={form.country} onChange={handleChange} className="select-field">
                  <option value="">Select country...</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 text-base mt-2">
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--ae-ink-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-medium hover:opacity-80" style={{ color: 'var(--ae-red)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
