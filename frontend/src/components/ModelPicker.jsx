import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Zap, Star, Code2, Eye, Brain } from 'lucide-react';

// All models organized by provider — mirrors backend PROVIDERS
const PROVIDER_MODELS = {
  openrouter_free: {
    label: 'OpenRouter',
    color: '#7c5cfc',
    icon: '🔀',
    models: [
      { id: 'openrouter/free',                           label: 'Auto-select Free Model',    tag: 'Recommended', icon: '🔀' },
      { id: 'meta-llama/llama-4-maverick:free',          label: 'Llama 4 Maverick',          tag: 'Latest',      icon: '🦙' },
      { id: 'meta-llama/llama-4-scout:free',             label: 'Llama 4 Scout',             tag: 'Fast',        icon: '🦙' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free',    label: 'Llama 3.3 70B',             tag: '',            icon: '🦙' },
      { id: 'meta-llama/llama-3.1-405b-instruct:free',   label: 'Llama 3.1 405B',           tag: 'Powerful',    icon: '🦙' },
      { id: 'deepseek/deepseek-r1:free',                 label: 'DeepSeek R1',               tag: 'Reasoning',   icon: '🧠' },
      { id: 'deepseek/deepseek-chat:free',               label: 'DeepSeek V3',               tag: '',            icon: '💬' },
      { id: 'google/gemma-3-27b-it:free',                label: 'Gemma 3 27B',               tag: '',            icon: '✨' },
      { id: 'mistralai/devstral-small:free',             label: 'Devstral Small',            tag: 'Code',        icon: '💻' },
      { id: 'mistralai/mistral-7b-instruct:free',        label: 'Mistral 7B',                tag: 'Fast',        icon: '🌬️' },
      { id: 'qwen/qwen3-8b:free',                        label: 'Qwen3 8B',                  tag: '',            icon: '🔮' },
      { id: 'qwen/qwen3-coder-480b-a35b-instruct:free',  label: 'Qwen3 Coder 480B',          tag: 'Code',        icon: '💻' },
    ],
  },
  ollama_cloud: {
    label: 'Ollama Cloud',
    color: '#0ea5e9',
    icon: '🦙',
    models: [
      { id: 'llama3.3:cloud',       label: 'Llama 3.3 70B',    tag: 'Recommended', icon: '🦙' },
      { id: 'llama4:cloud',         label: 'Llama 4 Scout',    tag: 'Latest',      icon: '🦙' },
      { id: 'deepseek-r1:cloud',    label: 'DeepSeek R1',      tag: 'Reasoning',   icon: '🧠' },
      { id: 'deepseek-v3.1:cloud',  label: 'DeepSeek V3.1',    tag: '',            icon: '💬' },
      { id: 'qwen3:cloud',          label: 'Qwen3 8B',         tag: 'Fast',        icon: '🔮' },
      { id: 'qwen3:30b-cloud',      label: 'Qwen3 30B',        tag: '',            icon: '🔮' },
      { id: 'gpt-oss:20b-cloud',    label: 'GPT-OSS 20B',      tag: '',            icon: '🤖' },
      { id: 'gpt-oss:120b-cloud',   label: 'GPT-OSS 120B',     tag: 'Powerful',    icon: '🤖' },
      { id: 'gemma3:cloud',         label: 'Gemma 3 9B',       tag: '',            icon: '✨' },
      { id: 'phi4:cloud',           label: 'Phi-4 14B',        tag: '',            icon: '🔬' },
    ],
  },
  anthropic: {
    label: 'Anthropic',
    color: '#c96442',
    icon: '🤖',
    models: [
      { id: 'claude-sonnet-4-5',           label: 'Claude Sonnet 4.5',   tag: 'Latest',        icon: '🤖' },
      { id: 'claude-opus-4-5',             label: 'Claude Opus 4.5',     tag: 'Most Powerful', icon: '🤖' },
      { id: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5',    tag: 'Fast',          icon: '🤖' },
      { id: 'claude-3-5-sonnet-20241022',  label: 'Claude 3.5 Sonnet',   tag: '',              icon: '🤖' },
      { id: 'claude-3-5-haiku-20241022',   label: 'Claude 3.5 Haiku',    tag: 'Fast',          icon: '🤖' },
      { id: 'claude-3-opus-20240229',      label: 'Claude 3 Opus',       tag: '',              icon: '🤖' },
    ],
  },
  openai: {
    label: 'OpenAI',
    color: '#10a37f',
    icon: '🧠',
    models: [
      { id: 'gpt-4o',       label: 'GPT-4o',       tag: 'Recommended', icon: '🧠' },
      { id: 'gpt-4o-mini',  label: 'GPT-4o Mini',  tag: 'Fast',        icon: '🧠' },
      { id: 'gpt-4.1',      label: 'GPT-4.1',      tag: 'New',         icon: '🧠' },
      { id: 'gpt-5',        label: 'GPT-5',        tag: 'Powerful',    icon: '🧠' },
      { id: 'o3',           label: 'o3',           tag: 'Reasoning',   icon: '🧮' },
      { id: 'o4-mini',      label: 'o4-mini',      tag: 'Fast Reason', icon: '🧮' },
    ],
  },
  groq: {
    label: 'Groq',
    color: '#f55036',
    icon: '⚡',
    models: [
      { id: 'llama-3.3-70b-versatile',        label: 'Llama 3.3 70B',    tag: 'Latest',    icon: '⚡' },
      { id: 'llama-3.1-405b-reasoning',        label: 'Llama 3.1 405B',   tag: 'Powerful',  icon: '⚡' },
      { id: 'llama-3.1-8b-instant',            label: 'Llama 3.1 8B',     tag: 'Fastest',   icon: '⚡' },
      { id: 'mixtral-8x7b-32768',              label: 'Mixtral 8x7B',     tag: '',          icon: '⚡' },
      { id: 'deepseek-r1-distill-llama-70b',   label: 'DeepSeek R1 70B',  tag: 'Reasoning', icon: '🧠' },
      { id: 'gemma2-9b-it',                    label: 'Gemma 2 9B',       tag: '',          icon: '✨' },
    ],
  },
  mistral: {
    label: 'Mistral',
    color: '#ff7000',
    icon: '🌬️',
    models: [
      { id: 'mistral-large-latest',   label: 'Mistral Large 2',  tag: 'Latest',   icon: '🌬️' },
      { id: 'mistral-medium-latest',  label: 'Mistral Medium',   tag: '',         icon: '🌬️' },
      { id: 'mistral-small-latest',   label: 'Mistral Small',    tag: 'Fast',     icon: '🌬️' },
      { id: 'codestral-latest',       label: 'Codestral',        tag: 'Code',     icon: '💻' },
      { id: 'pixtral-large-latest',   label: 'Pixtral Large',    tag: 'Vision',   icon: '👁️' },
      { id: 'ministral-8b-latest',    label: 'Ministral 8B',     tag: 'Fastest',  icon: '🌬️' },
    ],
  },
  google: {
    label: 'Google',
    color: '#4285f4',
    icon: '✨',
    models: [
      { id: 'gemini-2.5-pro-preview-05-06',   label: 'Gemini 2.5 Pro',      tag: 'Latest',   icon: '✨' },
      { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash',    tag: 'Fast',     icon: '✨' },
      { id: 'gemini-2.0-flash',               label: 'Gemini 2.0 Flash',    tag: '',         icon: '✨' },
      { id: 'gemini-1.5-pro',                 label: 'Gemini 1.5 Pro',      tag: '',         icon: '✨' },
      { id: 'gemini-1.5-flash',               label: 'Gemini 1.5 Flash',    tag: 'Fast',     icon: '✨' },
      { id: 'gemini-1.5-flash-8b',            label: 'Gemini 1.5 Flash 8B', tag: 'Fastest',  icon: '✨' },
    ],
  },
};

const TAG_STYLES = {
  'Latest':        { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  'Recommended':   { bg: 'rgba(124,58,237,0.2)',   color: '#a78bfa' },
  'Most Powerful': { bg: 'rgba(236,72,153,0.15)',  color: '#f472b6' },
  'Fast':          { bg: 'rgba(6,182,212,0.15)',   color: '#22d3ee' },
  'Fastest':       { bg: 'rgba(6,182,212,0.15)',   color: '#22d3ee' },
  'Reasoning':     { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  'Fast Reason':   { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  'Powerful':      { bg: 'rgba(236,72,153,0.15)',  color: '#f472b6' },
  'Code':          { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  'Vision':        { bg: 'rgba(139,92,246,0.15)',  color: '#c4b5fd' },
  'New':           { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
};

function getProviderForModel(modelId) {
  for (const [pId, pData] of Object.entries(PROVIDER_MODELS)) {
    if (pData.models.find(m => m.id === modelId)) return { providerId: pId, ...pData };
  }
  return null;
}

function getModelLabel(modelId) {
  for (const pData of Object.values(PROVIDER_MODELS)) {
    const m = pData.models.find(m => m.id === modelId);
    if (m) return m.label;
  }
  return modelId;
}

export { PROVIDER_MODELS, getModelLabel, getProviderForModel };

export default function ModelPicker({ selectedModel, onModelChange, activeProvider }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Figure out which provider owns the current model
  const currentProviderData = activeProvider
    ? PROVIDER_MODELS[activeProvider]
    : getProviderForModel(selectedModel);

  const currentModel = (() => {
    for (const pData of Object.values(PROVIDER_MODELS)) {
      const m = pData.models.find(m => m.id === selectedModel);
      if (m) return m;
    }
    return { label: selectedModel || 'Select Model', icon: '🤖', tag: '' };
  })();

  // Build filtered list
  const filteredProviders = Object.entries(PROVIDER_MODELS).map(([pId, pData]) => ({
    providerId: pId,
    ...pData,
    models: pData.models.filter(m =>
      !search || m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.tag?.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(p => p.models.length > 0);

  const handleSelect = (modelId) => {
    onModelChange(modelId);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
        style={{
          background: open ? 'rgba(124,58,237,0.15)' : 'var(--bg-elevated)',
          border: `1px solid ${open ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
          color: 'var(--text-primary)',
          maxWidth: 260,
        }}
      >
        <span className="text-base leading-none">{currentModel.icon}</span>
        <span className="truncate text-sm font-medium" style={{ maxWidth: 160 }}>
          {currentModel.label}
        </span>
        {currentModel.tag && (
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
            style={TAG_STYLES[currentModel.tag] || { bg: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
            {currentModel.tag}
          </span>
        )}
        <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 z-50 rounded-2xl overflow-hidden"
            style={{
              width: 320,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-bright)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1)',
              maxHeight: 480,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Search */}
            <div className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search models..."
                className="nova-input w-full rounded-xl px-3 py-2 text-sm"
                style={{ background: 'var(--bg-elevated)' }}
              />
            </div>

            {/* Model list */}
            <div className="overflow-y-auto flex-1">
              {filteredProviders.map(provider => (
                <div key={provider.providerId}>
                  {/* Provider header */}
                  <div className="sticky top-0 flex items-center gap-2 px-4 py-2"
                    style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', zIndex: 1 }}>
                    <span className="text-sm">{provider.icon}</span>
                    <span className="text-xs font-bold" style={{ color: provider.color }}>{provider.label}</span>
                    {(provider.providerId === 'openrouter_free' || provider.providerId === 'ollama_cloud') && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold ml-1"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>FREE</span>
                    )}
                  </div>

                  {/* Models */}
                  {provider.models.map(model => {
                    const isSelected = selectedModel === model.id;
                    const tagStyle = TAG_STYLES[model.tag] || {};
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{
                          background: isSelected ? 'rgba(124,58,237,0.12)' : 'transparent',
                          borderLeft: isSelected ? `2px solid ${provider.color}` : '2px solid transparent',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span className="text-sm flex-shrink-0">{model.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: isSelected ? 'white' : 'var(--text-primary)' }}>
                            {model.label}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem' }}>
                            {model.id}
                          </p>
                        </div>
                        {model.tag && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                            style={{ background: tagStyle.bg || 'rgba(255,255,255,0.1)', color: tagStyle.color || 'var(--text-muted)' }}>
                            {model.tag}
                          </span>
                        )}
                        {isSelected && <Check size={13} style={{ color: provider.color, flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              ))}

              {filteredProviders.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No models match "{search}"</p>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                🆓 Free models work without API keys · 💳 Paid models need keys in Settings
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
