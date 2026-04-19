import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Key, Palette, Volume2, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
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

const PLATFORMS = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    icon: '🤖',
    color: '#c96442',
    desc: 'Claude 3.5 Sonnet — Best for reasoning & writing',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    icon: '🧠',
    color: '#10a37f',
    desc: 'GPT-4o — Also enables image generation & TTS',
    placeholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: ['gpt-4o', 'gpt-4o-mini'],
  },
  {
    id: 'groq',
    label: 'Groq',
    icon: '⚡',
    color: '#f55036',
    desc: 'Llama 3.3 70B — Blazing fast inference',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  },
  {
    id: 'mistral',
    label: 'Mistral',
    icon: '🌬️',
    color: '#ff7000',
    desc: 'Mistral Large — Powerful European AI',
    placeholder: 'your-mistral-api-key',
    docsUrl: 'https://console.mistral.ai/api-keys/',
    models: ['mistral-large-latest', 'mistral-medium'],
  },
  {
    id: 'google',
    label: 'Google Gemini',
    icon: '✨',
    color: '#4285f4',
    desc: 'Gemini 1.5 Pro — Multimodal & long context',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  },
];

function ApiKeysTab() {
  const [keys, setKeys] = useState({ anthropic: '', openai: '', groq: '', mistral: '', google: '' });
  const [hasKeys, setHasKeys] = useState({});
  const [activeProvider, setActiveProvider] = useState('anthropic');
  const [showKey, setShowKey] = useState({});
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getApiKeys().then(data => {
      setActiveProvider(data.active_provider || 'anthropic');
      setHasKeys(data.has || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveKey = async (platformId) => {
    setSaving(s => ({ ...s, [platformId]: true }));
    try {
      await api.saveApiKeys({ [platformId]: keys[platformId], active_provider: activeProvider });
      setHasKeys(h => ({ ...h, [platformId]: !!keys[platformId] }));
      setKeys(k => ({ ...k, [platformId]: '' }));
      toast.success(`${PLATFORMS.find(p => p.id === platformId)?.label} key saved!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(s => ({ ...s, [platformId]: false }));
    }
  };

  const setActive = async (platformId) => {
    if (!hasKeys[platformId]) {
      toast('Save a key for this provider first', { icon: '⚠️' });
      return;
    }
    setActiveProvider(platformId);
    try {
      await api.saveApiKeys({ active_provider: platformId });
      toast.success(`Switched to ${PLATFORMS.find(p => p.id === platformId)?.label}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeKey = async (platformId) => {
    setSaving(s => ({ ...s, [platformId]: true }));
    try {
      await api.saveApiKeys({ [platformId]: '' });
      setHasKeys(h => ({ ...h, [platformId]: false }));
      if (activeProvider === platformId) {
        const fallback = PLATFORMS.find(p => p.id !== platformId && hasKeys[p.id]);
        if (fallback) { setActiveProvider(fallback.id); await api.saveApiKeys({ active_provider: fallback.id }); }
      }
      toast.success('Key removed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(s => ({ ...s, [platformId]: false }));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-light)' }} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Active provider selector */}
      <div className="p-3 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-light)' }}>ACTIVE AI PROVIDER</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => setActive(p.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeProvider === p.id ? p.color + '22' : 'var(--bg-hover)',
                border: `1px solid ${activeProvider === p.id ? p.color + '66' : 'transparent'}`,
                color: activeProvider === p.id ? p.color : 'var(--text-muted)',
                opacity: hasKeys[p.id] ? 1 : 0.4,
              }}>
              <span>{p.icon}</span>
              {p.label}
              {activeProvider === p.id && <Check size={10} />}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Nova uses your active provider for all conversations. Falls back to server keys if user keys are not set.
        </p>
      </div>

      {/* Platform cards */}
      {PLATFORMS.map(platform => (
        <div key={platform.id} className="rounded-xl overflow-hidden"
          style={{ border: `1px solid ${activeProvider === platform.id && hasKeys[platform.id] ? platform.color + '44' : 'var(--border)'}` }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3"
            style={{ background: activeProvider === platform.id && hasKeys[platform.id] ? platform.color + '11' : 'var(--bg-elevated)' }}>
            <span className="text-xl">{platform.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{platform.label}</p>
                {hasKeys[platform.id] && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: platform.color + '22', color: platform.color }}>
                    ✓ Saved
                  </span>
                )}
                {activeProvider === platform.id && hasKeys[platform.id] && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--accent-light)' }}>
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{platform.desc}</p>
            </div>
            <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors"
              style={{ color: 'var(--accent-light)', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              Get key ↗
            </a>
          </div>

          {/* Input row */}
          <div className="px-4 pb-3 pt-2 flex gap-2" style={{ background: 'var(--bg-surface)' }}>
            <div className="relative flex-1">
              <input
                type={showKey[platform.id] ? 'text' : 'password'}
                value={keys[platform.id]}
                onChange={e => setKeys(k => ({ ...k, [platform.id]: e.target.value }))}
                placeholder={hasKeys[platform.id] ? '••••••••••••••••••• (saved)' : platform.placeholder}
                className="nova-input w-full rounded-xl px-4 py-2.5 text-sm pr-10"
                onKeyDown={e => e.key === 'Enter' && keys[platform.id] && saveKey(platform.id)}
                style={{ fontFamily: keys[platform.id] ? 'JetBrains Mono, monospace' : 'inherit', fontSize: '0.8rem' }}
              />
              <button onClick={() => setShowKey(s => ({ ...s, [platform.id]: !s[platform.id] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                {showKey[platform.id] ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <button
              onClick={() => saveKey(platform.id)}
              disabled={!keys[platform.id] || saving[platform.id]}
              className="px-3.5 py-2.5 rounded-xl text-sm font-medium flex-shrink-0 transition-all"
              style={{
                background: keys[platform.id] ? platform.color : 'var(--bg-hover)',
                color: keys[platform.id] ? 'white' : 'var(--text-muted)',
                opacity: saving[platform.id] ? 0.7 : 1,
              }}>
              {saving[platform.id] ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
            </button>
            {hasKeys[platform.id] && (
              <button onClick={() => removeKey(platform.id)} disabled={saving[platform.id]}
                className="px-3 py-2.5 rounded-xl text-sm transition-all flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                Remove
              </button>
            )}
          </div>
        </div>
      ))}

      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        🔒 Keys are stored encrypted on the server and never shared. You can also set server-wide keys in Render environment variables.
      </p>
    </div>
  );
}

export default function SettingsModal({ onClose }) {
  const { user, updateUser } = useAuthStore();
  const [tab, setTab] = useState('api');
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
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-bright)', maxHeight: '85vh' }}>

          {/* Sidebar */}
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
                {t.id === 'api' && <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.3)', color: 'var(--accent-light)' }}>5</span>}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
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
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nova AI uses a beautiful dark theme. Light mode coming soon.</p>
                  <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
                    <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--nova-gradient)' }} />
                    <div><p className="font-medium text-sm">Nova Dark</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Current theme ✓</p></div>
                  </div>
                  <div className="p-4 rounded-xl flex items-center gap-3 opacity-50 cursor-not-allowed" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="w-10 h-10 rounded-xl bg-white" />
                    <div><p className="font-medium text-sm">Nova Light</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Coming soon</p></div>
                  </div>
                </div>
              )}

              {tab === 'voice' && (
                <div className="space-y-3">
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Choose Nova's voice for text-to-speech (requires OpenAI API key).</p>
                  {VOICES.map(v => (
                    <button key={v.id} onClick={() => setSelectedVoice(v.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{ background: selectedVoice === v.id ? 'rgba(124,58,237,0.15)' : 'var(--bg-elevated)', border: '1px solid ' + (selectedVoice === v.id ? 'rgba(124,58,237,0.4)' : 'var(--border)') }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: selectedVoice === v.id ? 'var(--nova-gradient)' : 'var(--bg-hover)' }}>
                        <Volume2 size={14} style={{ color: selectedVoice === v.id ? 'white' : 'var(--text-muted)' }} />
                      </div>
                      <div><p className="font-medium text-sm">{v.label}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.desc}</p></div>
                      {selectedVoice === v.id && <div className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--accent-light)' }} />}
                    </button>
                  ))}
                </div>
              )}

              {tab === 'api' && <ApiKeysTab />}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
