import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check, Volume2, VolumeX, User, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3">
      <button onClick={copy} className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <pre className={className} style={{ margin: 0 }}>
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}

export default function Message({ message, isStreaming }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);
  const isUser = message.role === 'user';

  const content = message.content || '';
  const metadata = typeof message.metadata === 'string' ? JSON.parse(message.metadata || '{}') : (message.metadata || {});

  const copyMessage = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const speak = async () => {
    if (speaking) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setSpeaking(false);
      return;
    }
    try {
      setSpeaking(true);
      const blob = await api.tts(content.slice(0, 4000));
      const url = URL.createObjectURL(blob);
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audioRef.current.play();
    } catch (err) {
      toast.error('TTS requires OpenAI API key');
      setSpeaking(false);
    }
  };

  if (message.type === 'image' && metadata.url) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 group">
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
          <Sparkles size={14} color="white" />
        </div>
        <div className="max-w-lg">
          <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Generated image</div>
          <img src={metadata.url} alt={metadata.prompt} className="rounded-2xl max-w-full" style={{ border: '1px solid var(--border)' }} />
          <p className="text-xs mt-2 italic" style={{ color: 'var(--text-muted)' }}>{metadata.prompt}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 group ${isUser ? 'justify-end' : ''}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center flex-col gap-0.5"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', flexShrink: 0 }}>
          <Sparkles size={14} color="white" />
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'max-w-[70%]' : 'flex-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
          style={{
            background: isUser
              ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(168,85,247,0.2))'
              : 'var(--bg-elevated)',
            border: '1px solid ' + (isUser ? 'rgba(124,58,237,0.4)' : 'var(--border)'),
          }}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    if (inline) return <code className={className} {...props}>{children}</code>;
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                  },
                  pre({ children }) { return <>{children}</>; }
                }}
              >
                {content}
              </ReactMarkdown>
              {isStreaming && <span className="cursor-blink inline-block w-2 h-4 ml-0.5" style={{ background: 'var(--accent-light)' }} />}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isUser && !isStreaming && content && (
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={copyMessage} className="p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs"
              style={{ color: copied ? 'var(--success)' : 'var(--text-muted)' }}
              title="Copy">
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            <button onClick={speak} className="p-1.5 rounded-lg transition-colors"
              style={{ color: speaking ? 'var(--accent-light)' : 'var(--text-muted)' }}
              title={speaking ? 'Stop' : 'Speak'}>
              {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <User size={14} style={{ color: 'var(--text-secondary)' }} />
        </div>
      )}
    </motion.div>
  );
}
