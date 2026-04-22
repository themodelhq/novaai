import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, MessageSquare, ChevronLeft, ChevronRight, Image, Sparkles, LogOut, User, Settings } from 'lucide-react';
import { useChatStore } from '../context/chatStore';
import { useAuthStore } from '../context/authStore';
import { formatDistanceToNow } from 'date-fns';
import { NovaLogo } from '../pages/AuthPage';
import toast from 'react-hot-toast';

export default function Sidebar({ collapsed, onToggle, onOpenSettings }) {
  const { conversations, activeConvId, createConversation, deleteConversation, loadConversation, setActiveConv } = useChatStore();
  const { user, logout } = useAuthStore();
  const [deleting, setDeleting] = useState(null);

  const handleNew = async () => {
    await createConversation();
  };

  const handleSelect = async (id) => {
    if (id === activeConvId) return;
    await loadConversation(id);
    setActiveConv(id);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await deleteConversation(id);
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
    setDeleting(null);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex flex-col h-full relative flex-shrink-0"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', minHeight: 64 }}>
        <div className="flex-shrink-0">
          <NovaLogo size={32} />
        </div>
        {!collapsed && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-lg text-gradient"
            style={{ fontFamily: 'Clash Display, sans-serif', whiteSpace: 'nowrap' }}>
            Nova AI
          </motion.span>
        )}
        <button onClick={onToggle} className="ml-auto p-1.5 rounded-lg transition-colors flex-shrink-0"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* New Chat */}
      <div className="p-3 flex-shrink-0">
        <button onClick={handleNew}
          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all btn-nova"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <Plus size={16} />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {!collapsed && conversations.length === 0 && (
          <div className="text-center py-8 px-4">
            <MessageSquare size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No conversations yet.<br />Start a new chat!</p>
          </div>
        )}
        <AnimatePresence>
          {conversations.map(conv => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={() => handleSelect(conv.id)}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left group transition-colors relative"
              style={{
                background: activeConvId === conv.id ? 'rgba(124,58,237,0.2)' : 'transparent',
                border: activeConvId === conv.id ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                justifyContent: collapsed ? 'center' : 'flex-start'
              }}
            >
              <MessageSquare size={14} style={{ color: activeConvId === conv.id ? 'var(--accent-light)' : 'var(--text-muted)', flexShrink: 0 }} />
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: activeConvId === conv.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {conv.title || 'New Conversation'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {formatDistanceToNow(conv.updated_at * 1000, { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all flex-shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {deleting === conv.id
                      ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                      : <Trash2 size={12} />}
                  </button>
                </>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom user area */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: user?.avatar_color || 'var(--accent)', color: 'white' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.username}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.plan === 'pro' ? '⭐ Pro' : 'Free'}</p>
            </div>
            <button onClick={onOpenSettings} title="Settings" className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
              <Settings size={14} />
            </button>
            <button onClick={logout} title="Sign out" className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <button onClick={onOpenSettings} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><Settings size={14} /></button>
            <button onClick={logout} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><LogOut size={14} /></button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
