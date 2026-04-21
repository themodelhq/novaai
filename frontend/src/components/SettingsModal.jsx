import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Key, Palette, Volume2, Eye, EyeOff, Check, Loader2, Play, ChevronDown, ChevronUp, Copy, CheckCheck, Zap, Shield } from 'lucide-react';
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
  { id: 'api', label: 'AI Providers', icon: Key },
];

// ─── FREE PROVIDERS (no credit card) ─────────────────────────────────────────
const FREE_PLATFORMS = [
  {
    id: 'openrouter_free',
    keyId: 'openrouter',
    label: 'OpenRouter',
    icon: '🔀',
    color: '#7c5cfc',
    badge: 'FREE',
    badgeColor: '#10b981',
    desc: 'Access 28+ free models (Llama 4, DeepSeek R1, Gemma, Qwen3 & more). Free account, no credit card.',
    placeholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    note: 'Sign up free at openrouter.ai — no credit card needed. Leave key empty to use anonymous free tier (rate limited).',
    models: [
      { id: 'openrouter/free',                            label: 'Auto-select best free model', tag: 'Recommended' },
      { id: 'meta-llama/llama-4-maverick:free',           label: 'Llama 4 Maverick',            tag: 'Latest' },
      { id: 'meta-llama/llama-4-scout:free',              label: 'Llama 4 Scout',               tag: 'Fast' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free',     label: 'Llama 3.3 70B',               tag: '' },
      { id: 'meta-llama/llama-3.1-405b-instruct:free',    label: 'Llama 3.1 405B',              tag: 'Powerful' },
      { id: 'deepseek/deepseek-r1:free',                  label: 'DeepSeek R1',                 tag: 'Reasoning' },
      { id: 'deepseek/deepseek-chat:free',                label: 'DeepSeek V3',                 tag: '' },
      { id: 'google/gemma-3-27b-it:free',                 label: 'Gemma 3 27B',                 tag: '' },
      { id: 'mistralai/devstral-small:free',              label: 'Devstral Small',              tag: 'Code' },
      { id: 'mistralai/mistral-7b-instruct:free',         label: 'Mistral 7B',                  tag: 'Fast' },
      { id: 'qwen/qwen3-8b:free',                         label: 'Qwen3 8B',                    tag: '' },
      { id: 'qwen/qwen3-coder-480b-a35b-instruct:free',   label: 'Qwen3 Coder 480B',            tag: 'Code' },
    ],
    defaultModel: 'openrouter/free',
  },
  {
    id: 'ollama_cloud',
    keyId: null,
    label: 'Ollama Cloud',
    icon: '🦙',
    color: '#0ea5e9',
    badge: 'FREE',
    badgeColor: '#10b981',
    desc: 'Run Llama, DeepSeek & Qwen3 on Ollama cloud infrastructure. Zero cost, no key needed.',
    placeholder: null,
    docsUrl: 'https://ollama.com',
    note: 'No API key required. Ollama Cloud is free with generous limits. Models run on Ollama\'s servers.',
    models: [
      { id: 'llama3.3',          label: 'Llama 3.3 70B',    tag: 'Recommended' },
      { id: 'llama4',            label: 'Llama 4 Scout',    tag: 'Latest' },
      { id: 'deepseek-r1',       label: 'DeepSeek R1',      tag: 'Reasoning' },
      { id: 'deepseek-v3',       label: 'DeepSeek V3',      tag: '' },
      { id: 'qwen3',             label: 'Qwen3 8B',         tag: 'Fast' },
      { id: 'qwen3:30b',         label: 'Qwen3 30B',        tag: '' },
      { id: 'gemma3',            label: 'Gemma 3 9B',       tag: '' },
      { id: 'phi4',              label: 'Phi-4 14B',        tag: '' },
      { id: 'mistral',           label: 'Mistral 7B',       tag: 'Fast' },
    ],
    defaultModel: 'llama3.3',
  },
];

// ─── PAID PROVIDERS (API key required) ───────────────────────────────────────
const PAID_PLATFORMS = [
  {
    id: 'anthropic',
    keyId: 'anthropic',
    label: 'Anthropic',
    icon: '🤖',
    color: '#c96442',
    badge: 'PAID',
    badgeColor: '#f59e0b',
    desc: 'Claude — Best reasoning, coding & writing. Highest quality.',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-sonnet-4-5',           label: 'Claude Sonnet 4.5',       tag: 'Latest' },
      { id: 'claude-opus-4-5',             label: 'Claude Opus 4.5',         tag: 'Most Powerful' },
      { id: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5',        tag: 'Fast' },
      { id: 'claude-3-5-sonnet-20241022',  label: 'Claude 3.5 Sonnet',       tag: '' },
      { id: 'claude-3-5-haiku-20241022',   label: 'Claude 3.5 Haiku',        tag: 'Fast' },
      { id: 'claude-3-opus-20240229',      label: 'Claude 3 Opus',           tag: '' },
    ],
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  {
    id: 'openai',
    keyId: 'openai',
    label: 'OpenAI',
    icon: '🧠',
    color: '#10a37f',
    badge: 'PAID',
    badgeColor: '#f59e0b',
    desc: 'GPT models — Also enables image generation (DALL-E 3) & TTS voice.',
    placeholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o',       label: 'GPT-4o',         tag: 'Recommended' },
      { id: 'gpt-4o-mini',  label: 'GPT-4o Mini',    tag: 'Fast' },
      { id: 'gpt-4.1',      label: 'GPT-4.1',        tag: 'New' },
      { id: 'gpt-5',        label: 'GPT-5',          tag: 'Most Powerful' },
      { id: 'o3',           label: 'o3',             tag: 'Reasoning' },
      { id: 'o4-mini',      label: 'o4-mini',        tag: 'Fast Reasoning' },
    ],
    defaultModel: 'gpt-4o',
  },
  {
    id: 'groq',
    keyId: 'groq',
    label: 'Groq',
    icon: '⚡',
    color: '#f55036',
    badge: 'PAID',
    badgeColor: '#f59e0b',
    desc: 'Blazing-fast inference — fastest token generation available.',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile',          label: 'Llama 3.3 70B',         tag: 'Latest' },
      { id: 'llama-3.1-405b-reasoning',          label: 'Llama 3.1 405B',        tag: 'Powerful' },
      { id: 'llama-3.1-8b-instant',              label: 'Llama 3.1 8B',          tag: 'Fastest' },
      { id: 'mixtral-8x7b-32768',                label: 'Mixtral 8x7B',          tag: '' },
      { id: 'deepseek-r1-distill-llama-70b',     label: 'DeepSeek R1 70B',       tag: 'Reasoning' },
      { id: 'gemma2-9b-it',                      label: 'Gemma 2 9B',            tag: '' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    id: 'mistral',
    keyId: 'mistral',
    label: 'Mistral',
    icon: '🌬️',
    color: '#ff7000',
    badge: 'PAID',
    badgeColor: '#f59e0b',
    desc: 'European AI — multilingual, privacy-focused, powerful.',
    placeholder: 'your-mistral-api-key',
    docsUrl: 'https://console.mistral.ai/api-keys/',
    models: [
      { id: 'mistral-large-latest',    label: 'Mistral Large 2',   tag: 'Latest' },
      { id: 'mistral-medium-latest',   label: 'Mistral Medium',    tag: '' },
      { id: 'mistral-small-latest',    label: 'Mistral Small',     tag: 'Fast' },
      { id: 'codestral-latest',        label: 'Codestral',         tag: 'Code' },
      { id: 'pixtral-large-latest',    label: 'Pixtral Large',     tag: 'Vision' },
      { id: 'ministral-8b-latest',     label: 'Ministral 8B',      tag: 'Fastest' },
    ],
    defaultModel: 'mistral-large-latest',
  },
  {
    id: 'google',
    keyId: 'google',
    label: 'Google Gemini',
    icon: '✨',
    color: '#4285f4',
    badge: 'PAID',
    badgeColor: '#f59e0b',
    desc: 'Gemini — Multimodal AI with massive context windows.',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.5-pro-preview-05-06',   label: 'Gemini 2.5 Pro',       tag: 'Latest' },
      { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash',     tag: 'Fast' },
      { id: 'gemini-2.0-flash',               label: 'Gemini 2.0 Flash',     tag: '' },
      { id: 'gemini-1.5-pro',                 label: 'Gemini 1.5 Pro',       tag: '' },
      { id: 'gemini-1.5-flash',               label: 'Gemini 1.5 Flash',     tag: 'Fast' },
      { id: 'gemini-1.5-flash-8b',            label: 'Gemini 1.5 Flash 8B',  tag: 'Fastest' },
    ],
    defaultModel: 'gemini-2.5-pro-preview-05-06',
  },
];

const ALL_PLATFORMS = [...FREE_PLATFORMS, ...PAID_PLATFORMS];

// ── Test Panel ────────────────────────────────────────────────────────────────
function TestPanel({ platform, isFree }) {
  const [selectedModel, setSelectedModel] = useState(platform.defaultModel);
  const [testMsg, setTestMsg]             = useState('Say hello and tell me what model you are.');
  const [testing, setTesting]             = useState(false);
  const [result, setResult]               = useState(null);
  const [showRaw, setShowRaw]             = useState(false);
  const [copied, setCopied]               = useState(false);

  const curlUrl = platform.id === 'anthropic'
    ? 'https://api.anthropic.com/v1/messages'
    : platform.id === 'google'
    ? `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=YOUR_API_KEY`
    : platform.id === 'openrouter_free'
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : platform.id === 'ollama_cloud'
    ? 'https://ollama.com/api/chat'
    : platform.id === 'groq'
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : platform.id === 'mistral'
    ? 'https://api.mistral.ai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const curlCmd = platform.id === 'ollama_cloud'
    ? `curl -X POST "${curlUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"${selectedModel}","messages":[{"role":"user","content":"Hello!"}]}'`
    : `curl -X POST "${curlUrl}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -d '{"model":"${selectedModel}","messages":[{"role":"user","content":"Hello!"}],"max_tokens":200}'`;

  const runTest = async () => {
    setTesting(true); setResult(null);
    try {
      const r = await api.testApiKey({ provider: platform.id, model: selectedModel, message: testMsg });
      setResult(r);
    } catch (err) { setResult({ ok: false, error: err.message }); }
    finally { setTesting(false); }
  };

  const copyCurl = () => { navigator.clipboard.writeText(curlCmd); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="mx-4 mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--accent-light)' }}>&gt;_</span>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Test Example</span>
        {isFree && <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>No key needed</span>}
      </div>
      <div className="p-3 space-y-3">
        {/* Model selector */}
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Model</p>
          <div className="relative">
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
              className="nova-input w-full rounded-lg px-3 py-2 text-sm appearance-none pr-8"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>
              {platform.models.map(m => <option key={m.id} value={m.id}>{m.label}{m.tag ? ` — ${m.tag}` : ''}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>

        {/* cURL snippet */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Chat</span>
            <div className="flex gap-1.5">
              <button onClick={copyCurl} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{ background: 'var(--bg-elevated)', color: copied ? '#10b981' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {copied ? <CheckCheck size={11} /> : <Copy size={11} />}{copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={runTest} disabled={testing} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg font-medium transition-all"
                style={{ background: platform.color, color: 'white', opacity: testing ? 0.8 : 1 }}>
                {testing ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                {testing ? 'Testing...' : 'Test'}
              </button>
            </div>
          </div>
          <div className="rounded-lg p-3 font-mono text-xs overflow-x-auto" style={{ background: '#0a0714', border: '1px solid var(--border)', color: '#a78bfa', lineHeight: 1.6 }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{curlCmd}</pre>
          </div>
        </div>

        <div className="flex gap-2">
          <input value={testMsg} onChange={e => setTestMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !testing && runTest()}
            placeholder="Test message..." className="nova-input flex-1 rounded-lg px-3 py-2 text-xs" />
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-3 space-y-2"
              style={{ background: result.ok ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${result.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: result.ok ? '#10b981' : '#ef4444' }}>
                  {result.ok ? <Check size={10} color="white" /> : <X size={10} color="white" />}
                </div>
                <p className="text-xs font-semibold" style={{ color: result.ok ? '#10b981' : '#ef4444' }}>
                  {result.ok ? 'API call successful!' : 'API call failed'}
                </p>
              </div>
              {result.ok && result.response && <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{result.response}</p>}
              {!result.ok && result.error && <p className="text-xs" style={{ color: '#ef4444' }}>{result.error}</p>}
              {result.ok && result.tokens && (
                <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>Tokens:</span>
                  <span>Prompt: <strong style={{ color: 'var(--text-secondary)' }}>{result.tokens.prompt}</strong></span>
                  <span>Completion: <strong style={{ color: 'var(--text-secondary)' }}>{result.tokens.completion}</strong></span>
                  <span>Total: <strong style={{ color: platform.color }}>{result.tokens.total}</strong></span>
                </div>
              )}
              {result.ok && result.rawJson && (
                <div>
                  <button onClick={() => setShowRaw(v => !v)} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {showRaw ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Raw API Response
                  </button>
                  {showRaw && (
                    <pre className="mt-2 text-xs p-2 rounded-lg overflow-x-auto"
                      style={{ background: 'var(--bg-base)', color: '#a78bfa', fontFamily: 'JetBrains Mono, monospace', maxHeight: 160 }}>
                      {JSON.stringify(result.rawJson, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Platform Card ─────────────────────────────────────────────────────────────
function PlatformCard({ platform, hasKey, isFree, isActive, activeProvider, keys, onSave, onRemove, onSetActive, saving }) {
  const [inputVal, setInputVal] = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [expanded, setExpanded] = useState(isActive || hasKey);

  useEffect(() => { if (isActive || hasKey) setExpanded(true); }, [isActive, hasKey]);

  const needsKey   = !!platform.placeholder;
  const canExpand  = !needsKey || hasKey; // no-key providers always expandable

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${isActive ? platform.color + '55' : 'var(--border)'}` }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        style={{ background: isActive ? platform.color + '11' : 'var(--bg-elevated)' }}
        onClick={() => setExpanded(v => !v)}>
        <span className="text-xl">{platform.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{platform.label}</p>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: platform.badgeColor + '22', color: platform.badgeColor }}>
              {platform.badge}
            </span>
            {hasKey && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: platform.color + '22', color: platform.color }}>✓ Ready</span>
            )}
            {!needsKey && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>No key needed</span>
            )}
            {isActive && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--accent-light)' }}>● Active</span>
            )}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{platform.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          {platform.docsUrl && (
            <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
              style={{ color: 'var(--accent-light)', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              {needsKey ? 'Get key ↗' : 'Docs ↗'}
            </a>
          )}
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>

            {/* Note */}
            {platform.note && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)', color: 'var(--text-secondary)' }}>
                ℹ️ {platform.note}
              </div>
            )}

            {/* Key input (only for providers that need a key) */}
            {needsKey && (
              <div className="px-4 pb-3 pt-3 flex gap-2" style={{ background: 'var(--bg-surface)' }}>
                <div className="relative flex-1">
                  <input type={showKey ? 'text' : 'password'} value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    placeholder={hasKey ? '••••••••••••• (key saved)' : platform.placeholder}
                    className="nova-input w-full rounded-xl px-4 py-2.5 text-sm pr-10"
                    onKeyDown={e => e.key === 'Enter' && inputVal && onSave(platform.keyId, inputVal, () => setInputVal(''))}
                    style={{ fontFamily: inputVal ? 'JetBrains Mono, monospace' : 'inherit', fontSize: '0.8rem' }} />
                  <button onClick={() => setShowKey(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <button onClick={() => onSave(platform.keyId, inputVal, () => setInputVal(''))}
                  disabled={!inputVal || saving[platform.keyId]}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium flex-shrink-0 transition-all"
                  style={{ background: inputVal ? platform.color : 'var(--bg-hover)', color: inputVal ? 'white' : 'var(--text-muted)', opacity: saving[platform.keyId] ? 0.7 : 1 }}>
                  {saving[platform.keyId] ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </button>
                {hasKey && (
                  <button onClick={() => onRemove(platform.keyId)} disabled={saving[platform.keyId]}
                    className="px-3 py-2.5 rounded-xl text-sm flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                    Remove
                  </button>
                )}
              </div>
            )}

            {/* Set Active button */}
            {!isActive && (hasKey || !needsKey) && (
              <div className="px-4 pb-3">
                <button onClick={() => onSetActive(platform.id)}
                  className="w-full py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: platform.color + '15', color: platform.color, border: `1px solid ${platform.color}33` }}>
                  Set as Active Provider
                </button>
              </div>
            )}

            {/* Test panel — show for free providers always, for paid only when key saved */}
            {(!needsKey || hasKey) && <TestPanel platform={platform} isFree={!needsKey} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────
function ApiKeysTab() {
  const [hasKeys, setHasKeys]           = useState({});
  const [activeProvider, setActiveProvider] = useState('openrouter_free');
  const [saving, setSaving]             = useState({});
  const [loading, setLoading]           = useState(true);
  const [keys, setKeys]                 = useState({});

  useEffect(() => {
    api.getApiKeys().then(data => {
      setActiveProvider(data.active_provider || 'openrouter_free');
      setHasKeys(data.has || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveKey = async (keyId, value, onSuccess) => {
    setSaving(s => ({ ...s, [keyId]: true }));
    try {
      await api.saveApiKeys({ [keyId]: value });
      setHasKeys(h => ({ ...h, [keyId]: !!value }));
      onSuccess?.();
      toast.success('Key saved!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(s => ({ ...s, [keyId]: false })); }
  };

  const removeKey = async (keyId) => {
    setSaving(s => ({ ...s, [keyId]: true }));
    try {
      await api.saveApiKeys({ [keyId]: '' });
      setHasKeys(h => ({ ...h, [keyId]: false }));
      toast.success('Key removed');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(s => ({ ...s, [keyId]: false })); }
  };

  const setActive = async (providerId) => {
    const platform = ALL_PLATFORMS.find(p => p.id === providerId);
    const needsKey = !!platform?.placeholder;
    if (needsKey && !hasKeys[platform?.keyId]) { toast('Save a key first', { icon: '⚠️' }); return; }
    setActiveProvider(providerId);
    try {
      await api.saveApiKeys({ active_provider: providerId });
      toast.success(`Switched to ${platform?.label}`);
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-light)' }} /></div>;

  return (
    <div className="space-y-4">
      {/* Fallback chain explanation */}
      <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
        <div className="flex items-center gap-2">
          <Zap size={13} style={{ color: 'var(--accent-light)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--accent-light)' }}>HOW IT WORKS — AUTOMATIC FALLBACK CHAIN</p>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>1st FREE</span>
          <span style={{ color: 'var(--text-muted)' }}>→ OpenRouter / Ollama Cloud (no cost)</span>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>2nd PAID</span>
          <span style={{ color: 'var(--text-muted)' }}>→ Your saved API keys (Anthropic, OpenAI, Groq, Mistral, Google)</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Nova tries your active provider first. If it fails, it automatically falls through the chain. No manual switching needed.
        </p>
      </div>

      {/* FREE TIER */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            🆓 FREE PROVIDERS — Primary
          </span>
          <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>
        <div className="space-y-2.5">
          {FREE_PLATFORMS.map(platform => (
            <PlatformCard key={platform.id} platform={platform}
              hasKey={hasKeys[platform.keyId] || !platform.placeholder}
              isFree={true}
              isActive={activeProvider === platform.id}
              activeProvider={activeProvider}
              keys={keys} saving={saving}
              onSave={saveKey} onRemove={removeKey} onSetActive={setActive} />
          ))}
        </div>
      </div>

      {/* PAID TIER */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            💳 PAID PROVIDERS — Fallback
          </span>
          <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>
        <div className="space-y-2.5">
          {PAID_PLATFORMS.map(platform => (
            <PlatformCard key={platform.id} platform={platform}
              hasKey={hasKeys[platform.keyId]}
              isFree={false}
              isActive={activeProvider === platform.id}
              activeProvider={activeProvider}
              keys={keys} saving={saving}
              onSave={saveKey} onRemove={removeKey} onSetActive={setActive} />
          ))}
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        <Shield size={11} style={{ display: 'inline', marginRight: 4 }} />
        Keys stored securely on your server — never shared or exposed.
      </p>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function SettingsModal({ onClose }) {
  const { user, updateUser } = useAuthStore();
  const [tab, setTab]               = useState('api');
  const [username, setUsername]     = useState(user?.username || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass]       = useState('');
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [saving, setSaving]         = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const body = {};
      if (username !== user?.username) body.username = username;
      if (newPass) { body.currentPassword = currentPass; body.newPassword = newPass; }
      if (!Object.keys(body).length) { toast('No changes to save'); setSaving(false); return; }
      const { user: updated } = await api.updateProfile(body);
      updateUser(updated);
      toast.success('Profile updated!');
      setCurrentPass(''); setNewPass('');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl rounded-2xl overflow-hidden flex"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-bright)', maxHeight: '90vh' }}>

          <div className="w-48 flex-shrink-0 p-3 space-y-1" style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p className="text-xs font-semibold px-3 pb-2 pt-1" style={{ color: 'var(--text-muted)' }}>SETTINGS</p>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-left transition-colors"
                style={{ background: tab === t.id ? 'rgba(124,58,237,0.2)' : 'transparent', color: tab === t.id ? 'var(--accent-light)' : 'var(--text-secondary)', border: tab === t.id ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent' }}>
                <t.icon size={14} />
                {t.label}
                {t.id === 'api' && <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>7</span>}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-bold text-lg" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                {TABS.find(t => t.id === tab)?.label}
              </h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors" style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {tab === 'profile' && (
                <>
                  <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: user?.avatar_color || 'var(--accent)', color: 'white' }}>
                      {user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{user?.username}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                      <p className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--accent-light)' }}>
                        {user?.plan === 'pro' ? '⭐ Pro' : '🌱 Free Plan'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Username</label>
                      <input value={username} onChange={e => setUsername(e.target.value)} className="nova-input w-full rounded-xl px-4 py-2.5 text-sm" /></div>
                    <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Current Password</label>
                      <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="Enter to change password" className="nova-input w-full rounded-xl px-4 py-2.5 text-sm" /></div>
                    <div><label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>New Password</label>
                      <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Leave blank to keep current" className="nova-input w-full rounded-xl px-4 py-2.5 text-sm" /></div>
                    <button onClick={saveProfile} disabled={saving} className="btn-nova px-5 py-2.5 rounded-xl text-sm font-medium">
                      {saving ? 'Saving...' : 'Save Changes'}</button>
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
