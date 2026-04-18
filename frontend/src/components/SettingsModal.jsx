import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Key, Palette, Volume2, Shield, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

const VOICES = [
  { id: 'alloy', label: 'Alloy', desc: 'Neutral & balanced' },
  { id: 'echo', label: 'Echo', desc: 'Deep & clear' },
  { id: 'fable', label: 'Fable', desc: 'Warm & expressive' },
  { id: 'onyx', label: 'Onyx', desc: 'Authoritative' },
  { id: 'nova', label: 'Nova', desc: 'Energetic & friendly' },
  { id: 'shimmer', label: 'Shimmer', desc: 'Soft & elegant' },
];

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'voice', label: 'Voice', icon: Volume2 },
  { id: 'api', label: 'API Keys', icon: Key },
];

export default function SettingsModal({ onClose }) {
  const { user, updateUser } = useAuthStore();
  const [tab, setTab] = useState('profile');
  const [username, setUsername] = useState(user?.username || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const body = {};
      if (username !== user?.username) body.username = username;
      if (newPass) { body.currentPassword = currentPass; body.newPassword = newPass; }
      if (Object.keys(body).length === 0) { toast('No changes to save'); setSaving(false); return; }
      const { user: updated } = await api.updateProfile(body);
      updateUser(updated);
      toast.success('Profile updated!');
      setCurrentPass(''); setNewPass('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl rounded-2xl overflow-hidden flex"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-bright)', maxHeight: '80vh' }}>
          {/* Sidebar tabs */}
          <div className="w-48 flex-shrink-0 p-3 space-y-1" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p className="text-xs font-semibold px-3 pb-2 pt-1" style={{ color: 'var(--text-muted)' }}>SETTINGS</p>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-left transition-colors"
                style={{
                  background: tab === t.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                  color: tab === t.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                  border: tab === t.id ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent'
                }}>
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-bold text-lg" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                {TABS.find(t => t.id === tab)?.label}
              </h2>
              <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {tab === 'profile' && (
                <>
                  <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{ background: user?.avatar_color || 'var(--accent)', color: 'white' }}>
                      {user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{user?.username}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                      <p className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block"
                        style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--accent-light)' }}>
                        {user?.plan === 'pro' ? '⭐ Pro' : '🌱 Free Plan'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Username</label>
                      <input value={username} onChange={e => setUsername(e.target.value)} className="nova-input w-full rounded-xl px-4 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Current Password</label>
                      <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)}
                        placeholder="Enter to change password" className="nova-input w-full rounded-xl px-4 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>New Password</label>
                      <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                        placeholder="Leave blank to keep current" className="nova-input w-full rounded-xl px-4 py-2.5 text-sm" />
                    </div>
                    <button onClick={saveProfile} disabled={saving} className="btn-nova px-5 py-2.5 rounded-xl text-sm font-medium">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}

              {tab === 'appearance' && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Nova AI uses a beautiful dark theme designed for long reading sessions. Light mode coming soon.
                  </p>
                  <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
                    <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--nova-gradient)' }} />
                    <div>
                      <p className="font-medium text-sm">Nova Dark</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Current theme ✓</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl flex items-center gap-3 opacity-50 cursor-not-allowed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="w-10 h-10 rounded-xl bg-white" />
                    <div>
                      <p className="font-medium text-sm">Nova Light</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Coming soon</p>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'voice' && (
                <div className="space-y-3">
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Choose Nova's voice for text-to-speech (requires OpenAI API key).</p>
                  {VOICES.map(v => (
                    <button key={v.id} onClick={() => setSelectedVoice(v.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: selectedVoice === v.id ? 'rgba(124,58,237,0.15)' : 'var(--bg-elevated)',
                        border: '1px solid ' + (selectedVoice === v.id ? 'rgba(124,58,237,0.4)' : 'var(--border)')
                      }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: selectedVoice === v.id ? 'var(--nova-gradient)' : 'var(--bg-hover)' }}>
                        <Volume2 size={14} style={{ color: selectedVoice === v.id ? 'white' : 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{v.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.desc}</p>
                      </div>
                      {selectedVoice === v.id && <div className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--accent-light)' }} />}
                    </button>
                  ))}
                </div>
              )}

              {tab === 'api' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p className="text-sm font-medium mb-1" style={{ color: '#f59e0b' }}>⚠️ Server-side Configuration Required</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      API keys are configured in the server's .env file for security. Contact your admin or add them to Render's environment variables.
                    </p>
                  </div>

                  {[
                    { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', desc: 'Powers Nova\'s chat intelligence', status: 'Required', icon: '🤖' },
                    { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', desc: 'Enables image generation (DALL-E 3) & text-to-speech', status: 'Optional', icon: '🎨' },
                  ].map(item => (
                    <div key={item.key} className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{item.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                          <code className="text-xs mt-1.5 block px-2 py-1 rounded" style={{ background: 'var(--bg-base)', color: 'var(--accent-light)', fontFamily: 'JetBrains Mono' }}>{item.key}</code>
                        </div>
                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                          style={{ background: item.status === 'Required' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: item.status === 'Required' ? '#ef4444' : '#10b981' }}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
