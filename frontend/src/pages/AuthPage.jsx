import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import toast from 'react-hot-toast';

function NovaLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="0.5" stopColor="#a855f7" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" fill="url(#logoGrad)" opacity="0.15" />
      <path d="M20 4L34 12V28L20 36L6 28V12L20 4Z" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" />
      <circle cx="20" cy="20" r="6" fill="url(#logoGrad)" />
      <line x1="20" y1="4" x2="20" y2="14" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" />
      <line x1="20" y1="26" x2="20" y2="36" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" />
      <line x1="34" y1="12" x2="25.2" y2="17" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" />
      <line x1="14.8" y1="23" x2="6" y2="28" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" />
      <line x1="6" y1="12" x2="14.8" y2="17" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" />
      <line x1="25.2" y1="23" x2="34" y2="28" stroke="url(#logoGrad)" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.username, form.password);
      }
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Background orbs */}
      <div className="bg-orb w-96 h-96 -top-32 -left-32" style={{ background: 'rgba(124,58,237,0.15)' }} />
      <div className="bg-orb w-80 h-80 -bottom-20 -right-20" style={{ background: 'rgba(236,72,153,0.1)' }} />
      <div className="bg-orb w-64 h-64 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: 'rgba(168,85,247,0.08)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <NovaLogo size={56} />
            </motion.div>
          </div>
          <h1 className="text-gradient text-3xl font-bold" style={{ fontFamily: 'Clash Display, sans-serif' }}>Nova AI</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            The AI that thinks beyond limits
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-6">
          {/* Tab toggle */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)} className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? 'white' : 'var(--text-secondary)'
                }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div key="username" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Username</label>
                  <input
                    type="text" required value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="yourname"
                    className="nova-input w-full rounded-xl px-4 py-3 text-sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="nova-input w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password" required value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="nova-input w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-nova w-full py-3 rounded-xl text-sm font-semibold mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                  </svg>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="font-semibold" style={{ color: 'var(--accent-light)' }}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: '💬', label: 'AI Chat' },
            { icon: '🎨', label: 'Images' },
            { icon: '🔊', label: 'Voice' },
          ].map(f => (
            <div key={f.label} className="glass rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export { NovaLogo };
