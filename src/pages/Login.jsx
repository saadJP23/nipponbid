import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { login as loginApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      const { data } = await loginApi(form);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-theme="light" style={{ background: 'var(--ae-canvas)', minHeight: 'calc(100vh - 64px)' }}
      className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <img src="/logo.svg" alt="NipponBid" className="h-10 w-10 object-contain" />
            <span className="font-bold text-2xl" style={{ color: 'var(--ae-ink)' }}>
              Nippon<span style={{ color: 'var(--ae-red)' }}>Bid</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ae-ink)' }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ae-ink-muted)' }}>Sign in to your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--ae-ink-faint)' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-3 text-base">
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--ae-ink-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium hover:opacity-80" style={{ color: 'var(--ae-red)' }}>Create one free</Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--ae-ink-faint)' }}>
          Demo admin: <span style={{ color: 'var(--ae-ink-muted)' }}>admin@nipponbid.com</span>
        </p>
      </div>
    </div>
  );
}
