import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, Image, Mic, MicOff, ImagePlus, Video, X, Loader2, Wand2
} from 'lucide-react';
import { useChatStore } from '../context/chatStore';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

export default function ChatInput({ convId }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [recording, setRecording] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showVideoGen, setShowVideoGen] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState('');
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const { sendMessage, streaming, activeConvId, createConversation, addImageMessage } = useChatStore();

  const handleSend = async () => {
    if ((!text.trim() && images.length === 0) || streaming) return;
    const msg = text.trim();
    const imgs = [...images];
    setText('');
    setImages([]);
    await sendMessage(msg, imgs);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files.slice(0, 4)) {
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(',')[1];
        setImages(prev => [...prev, { type: file.type, data: base64, preview: ev.target.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        // Use Web Speech API for transcription
        toast('Voice recorded! (Transcription requires OpenAI Whisper API)', { icon: '🎤' });
        setRecording(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);

      // Also try browser Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.onresult = (e) => {
          const transcript = e.results[0][0].transcript;
          setText(prev => prev + (prev ? ' ' : '') + transcript);
          recorder.stop();
        };
        recognition.onerror = () => recorder.stop();
        recognition.start();
      }
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setGeneratingImage(true);
    try {
      let cid = activeConvId;
      if (!cid) {
        const conv = await createConversation();
        cid = conv.id;
      }
      // First send a message describing what we're generating
      await sendMessage(`Generate an image: ${imagePrompt}`);
      const result = await api.generateImage({ prompt: imagePrompt, conversation_id: cid });
      addImageMessage(cid, result);
      setShowImageGen(false);
      setImagePrompt('');
      toast.success('Image generated!');
    } catch (err) {
      toast.error(err.message || 'Image generation failed. Add OPENAI_API_KEY.');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleVideoGen = async () => {
    if (!videoPrompt.trim()) return;
    // Send as a message - Nova AI will respond with guidance about video
    await sendMessage(`Create a video of: ${videoPrompt}. Please describe this video in detail, provide a storyboard, and suggest how to create it using tools like RunwayML, Pika Labs, or Sora.`);
    setShowVideoGen(false);
    setVideoPrompt('');
  };

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
      {/* Image previews */}
      <AnimatePresence>
        {images.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 mb-3 flex-wrap">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img.preview} alt="" className="w-16 h-16 rounded-xl object-cover" style={{ border: '1px solid var(--border)' }} />
                <button onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'var(--error)', color: 'white' }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image generation panel */}
      <AnimatePresence>
        {showImageGen && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="mb-3 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <ImagePlus size={14} style={{ color: 'var(--accent-light)' }} />
              <span className="text-sm font-medium">Generate Image with DALL-E 3</span>
              <button onClick={() => setShowImageGen(false)} className="ml-auto" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
            </div>
            <div className="flex gap-2">
              <input value={imagePrompt} onChange={e => setImagePrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerateImage()}
                placeholder="Describe the image you want..." className="nova-input flex-1 rounded-lg px-3 py-2 text-sm" />
              <button onClick={handleGenerateImage} disabled={generatingImage || !imagePrompt.trim()} className="btn-nova px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
                {generatingImage ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {generatingImage ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video generation panel */}
      <AnimatePresence>
        {showVideoGen && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="mb-3 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Video size={14} style={{ color: 'var(--accent-light)' }} />
              <span className="text-sm font-medium">Video Generation (AI-Guided)</span>
              <button onClick={() => setShowVideoGen(false)} className="ml-auto" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
            </div>
            <div className="flex gap-2">
              <input value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVideoGen()}
                placeholder="Describe the video scene..." className="nova-input flex-1 rounded-lg px-3 py-2 text-sm" />
              <button onClick={handleVideoGen} disabled={!videoPrompt.trim()} className="btn-nova px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
                <Video size={14} />
                Create
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Nova will provide a detailed video script and guide you through AI video tools.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input box */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); autoResize(e); }}
          onKeyDown={handleKeyDown}
          placeholder="Message Nova... (Shift+Enter for new line)"
          rows={1}
          className="w-full px-4 pt-3.5 pb-2 text-sm resize-none bg-transparent outline-none"
          style={{ color: 'var(--text-primary)', maxHeight: 200 }}
        />
        <div className="flex items-center gap-1 px-3 pb-3">
          {/* Toolbar */}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} title="Attach image"
            className="p-2 rounded-xl transition-colors hover:bg-white/5"
            style={{ color: images.length > 0 ? 'var(--accent-light)' : 'var(--text-muted)' }}>
            <Paperclip size={16} />
          </button>
          <button onClick={() => { setShowImageGen(v => !v); setShowVideoGen(false); }} title="Generate image"
            className="p-2 rounded-xl transition-colors hover:bg-white/5"
            style={{ color: showImageGen ? 'var(--accent-light)' : 'var(--text-muted)' }}>
            <ImagePlus size={16} />
          </button>
          <button onClick={() => { setShowVideoGen(v => !v); setShowImageGen(false); }} title="Generate video"
            className="p-2 rounded-xl transition-colors hover:bg-white/5"
            style={{ color: showVideoGen ? 'var(--accent-light)' : 'var(--text-muted)' }}>
            <Video size={16} />
          </button>
          <button onClick={recording ? stopRecording : startRecording} title={recording ? 'Stop recording' : 'Voice input'}
            className="p-2 rounded-xl transition-colors"
            style={{ color: recording ? 'var(--error)' : 'var(--text-muted)', background: recording ? 'rgba(239,68,68,0.1)' : 'transparent' }}>
            {recording ? (
              <div className="flex items-center gap-0.5">
                <div className="voice-bar h-3" />
                <div className="voice-bar h-4" />
                <div className="voice-bar h-3" />
                <div className="voice-bar h-4" />
                <div className="voice-bar h-3" />
              </div>
            ) : <Mic size={16} />}
          </button>

          <div className="flex-1" />

          {/* Send button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={(!text.trim() && images.length === 0) || streaming}
            className="p-2.5 rounded-xl transition-all"
            style={{
              background: (text.trim() || images.length > 0) && !streaming ? 'var(--nova-gradient)' : 'var(--bg-hover)',
              color: (text.trim() || images.length > 0) && !streaming ? 'white' : 'var(--text-muted)',
              cursor: (text.trim() || images.length > 0) && !streaming ? 'pointer' : 'not-allowed'
            }}>
            {streaming
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />}
          </motion.button>
        </div>
      </div>

      <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
        Nova can make mistakes. Verify important information.
      </p>
    </div>
  );
}
