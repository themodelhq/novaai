import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Code2, FileText, Globe, Zap, ImagePlus, Settings } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Message from '../components/Message';
import ChatInput from '../components/ChatInput';
import SettingsModal from '../components/SettingsModal';
import ModelPicker, { getModelLabel, getProviderForModel } from '../components/ModelPicker';
import { useChatStore } from '../context/chatStore';
import { useAuthStore } from '../context/authStore';

const SUGGESTIONS = [
  { icon: Code2,     text: 'Write a REST API in Node.js with authentication', color: '#7c3aed' },
  { icon: Sparkles,  text: 'Explain quantum entanglement simply',              color: '#a855f7' },
  { icon: ImagePlus, text: 'Generate an image of a futuristic city at sunset', color: '#ec4899' },
  { icon: FileText,  text: 'Proofread and improve my essay',                   color: '#f97316' },
  { icon: Globe,     text: 'Translate this text to French and explain idioms', color: '#06b6d4' },
  { icon: Zap,       text: 'Create a Python script to scrape a website',       color: '#10b981' },
];

function WelcomeScreen({ onSuggestion, selectedModel }) {
  const { user } = useAuthStore();
  const providerInfo = getProviderForModel(selectedModel);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-10">
        <motion.div
          className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)' }}
          animate={{ rotate: [0, 3, -3, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          <Sparkles size={36} color="white" />
        </motion.div>
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Clash Display, sans-serif' }}>
          Hello, <span className="text-gradient">{user?.username || 'there'}</span> 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
          I'm Nova, powered by <strong style={{ color: providerInfo?.color || 'var(--accent-light)' }}>
            {getModelLabel(selectedModel)}
          </strong>. What can I create for you?
        </p>
      </motion.div>

      {/* Capabilities pills */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2 justify-center mb-8 max-w-xl">
        {['Chat & Reasoning', 'Image Generation', 'Text-to-Speech', 'Code Writing', 'Image Analysis', 'Video Guidance'].map((cap, i) => (
          <motion.span key={cap} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: 'var(--accent-light)' }}>
            ✦ {cap}
          </motion.span>
        ))}
      </motion.div>

      {/* Suggestion cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl w-full">
        {SUGGESTIONS.map((s, i) => (
          <motion.button key={i}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
            onClick={() => onSuggestion(s.text)}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="p-3.5 rounded-xl text-left transition-all glass"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <s.icon size={16} style={{ color: s.color, marginBottom: '8px' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.text}</p>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

export default function ChatPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  const {
    activeConvId, messages, streaming, streamingText, streamingProvider,
    loadConversations, sendMessage,
    selectedModel, setSelectedModel, activeProvider,
  } = useChatStore();

  const currentMessages = (activeConvId ? messages[activeConvId] : null) || [];

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, streamingText]);

  const handleSuggestion = async (text) => { await sendMessage(text); };

  // Derive which provider the current model belongs to
  const providerInfo = getProviderForModel(selectedModel);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Background orbs */}
      <div className="bg-orb w-96 h-96 top-0 right-0" style={{ background: 'rgba(124,58,237,0.08)' }} />
      <div className="bg-orb w-80 h-80 bottom-0 left-0" style={{ background: 'rgba(236,72,153,0.05)' }} />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Chat header with model picker */}
        <div className="flex-shrink-0 px-4 py-2.5 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--border)', minHeight: 56, background: 'var(--bg-surface)' }}>

          {/* Model picker — the main feature */}
          <ModelPicker
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            activeProvider={activeProvider}
          />

          <div className="flex-1" />

          {/* Provider indicator */}
          {providerInfo && (
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <span>{providerInfo.icon}</span>
              <span>{providerInfo.label}</span>
              {(providerInfo.providerId === 'openrouter_free' || providerInfo.providerId === 'ollama_cloud') && (
                <span className="font-bold" style={{ color: '#10b981' }}>FREE</span>
              )}
            </div>
          )}

          {/* Live status */}
          <div className="flex items-center gap-1.5">
            {streaming ? (
              <div className="flex items-center gap-1.5">
                <motion.div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#10b981' }}
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                <span className="text-xs" style={{ color: '#10b981' }}>
                  {streamingProvider ? `via ${streamingProvider}` : 'Generating...'}
                </span>
              </div>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.8)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ready</span>
              </>
            )}
          </div>

          <button onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <Settings size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!activeConvId || currentMessages.length === 0 ? (
            <WelcomeScreen onSuggestion={handleSuggestion} selectedModel={selectedModel} />
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
              <AnimatePresence initial={false}>
                {currentMessages.map((msg) => (
                  <Message key={msg.id} message={msg} isStreaming={false} />
                ))}
              </AnimatePresence>

              {/* Streaming message */}
              {streaming && streamingText && (
                <Message
                  message={{ id: 'streaming', role: 'assistant', content: streamingText }}
                  isStreaming={true}
                />
              )}

              {/* Thinking dots */}
              {streaming && !streamingText && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: providerInfo?.color ? `linear-gradient(135deg, ${providerInfo.color}, #a855f7)` : 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                    <span className="text-sm">{providerInfo?.icon || '✨'}</span>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex gap-1.5 items-center h-5">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} className="w-2 h-2 rounded-full"
                          style={{ background: providerInfo?.color || 'var(--accent-light)' }}
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput convId={activeConvId} />
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
