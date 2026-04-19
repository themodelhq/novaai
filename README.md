# ⚡ Nova AI — Full-Stack AI Assistant

A powerful, production-ready AI web application with chat, image generation, text-to-speech, voice input, and more. Built with React + Node.js + SQLite.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Chat** | Streaming responses powered by Claude (Anthropic) |
| 🎨 **Image Generation** | DALL-E 3 integration — generate images from text |
| 🔊 **Text-to-Speech** | 6 OpenAI voices read responses aloud |
| 🎤 **Voice Input** | Browser Speech Recognition for hands-free input |
| 🖼️ **Image Analysis** | Upload images and ask Nova to analyze them |
| 🎬 **Video Guidance** | AI-assisted video creation scripts & storyboards |
| 💾 **Full Auth System** | Register, login, JWT sessions, profile management |
| 📚 **Conversation History** | All chats saved to SQLite with auto-titling |
| 📱 **Responsive UI** | Works on desktop and mobile |
| 🌙 **Beautiful Dark UI** | Nova-branded dark theme with glassmorphism |

---

## 🏗️ Tech Stack

**Frontend**
- React 18 + Vite
- Zustand (state management)
- Framer Motion (animations)
- React Markdown + Highlight.js (code rendering)
- Tailwind CSS

**Backend**
- Node.js + Express
- better-sqlite3 (embedded database — no external DB needed)
- JWT authentication
- Anthropic SDK (streaming)
- Server-Sent Events (SSE) for real-time streaming

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- Anthropic API key (get one at https://console.anthropic.com)
- OpenAI API key (optional — for images & TTS)

### 1. Install dependencies
```bash
# From root of project
npm run install:all
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
PORT=5000
JWT_SECRET=your-random-secret-here
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...        # Optional but needed for images/TTS
FRONTEND_URL=http://localhost:5173
```

### 3. Start development servers

**Terminal 1 — Backend:**
```bash
npm run dev:backend
```

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
```

Open http://localhost:5173 → Register → Start chatting!

---

## ☁️ Deploy to Render (Backend) + Netlify (Frontend)

### Backend → Render

1. Push this repo to GitHub
2. Go to https://render.com → New → Blueprint
3. Connect your GitHub repo — Render reads `render.yaml` automatically
4. Add environment variables in Render dashboard:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `OPENAI_API_KEY` — your OpenAI key (optional)
   - `FRONTEND_URL` — your Netlify URL (e.g. `https://nova-ai.netlify.app`)
   - `JWT_SECRET` — any random string (Render can auto-generate)
5. Deploy! Your backend URL will be something like `https://nova-ai-backend.onrender.com`

### Frontend → Netlify

1. Go to https://netlify.com → New site → Import from Git
2. Netlify reads `netlify.toml` automatically — base dir is `frontend`
3. Add environment variable in Netlify dashboard:
   - `VITE_API_URL` = `https://nova-ai-backend.onrender.com/api`
4. Deploy! Done.

---

## 📁 Project Structure

```
nova-ai/
├── backend/
│   ├── db/
│   │   └── database.js        # SQLite setup & schema
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   ├── routes/
│   │   ├── auth.js            # Register, login, profile
│   │   └── chat.js            # Conversations, messages, TTS, images
│   ├── server.js              # Express app
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Message.jsx    # Chat message with markdown + TTS
│   │   │   ├── Sidebar.jsx    # Conversation list
│   │   │   ├── ChatInput.jsx  # Input bar with all tools
│   │   │   └── SettingsModal.jsx
│   │   ├── context/
│   │   │   ├── authStore.js   # Zustand auth state
│   │   │   └── chatStore.js   # Zustand chat state
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx   # Login/Register
│   │   │   └── ChatPage.jsx   # Main chat UI
│   │   └── utils/
│   │       └── api.js         # API client + SSE streaming
│   └── .env.example
├── netlify.toml               # Netlify frontend config
├── render.yaml                # Render backend config
└── README.md
```

---

## 🔑 API Keys Guide

| Key | Where to get | Used for |
|---|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com | Chat (required) |
| `OPENAI_API_KEY` | https://platform.openai.com | Images (DALL-E 3) + TTS voices |

---

## 🎨 Extending Nova AI

### Add a new AI model
In `backend/routes/chat.js`, change the `model` field in `anthropic.messages.stream()`.

### Add video generation (RunwayML)
Sign up at https://runwayml.com, get an API key, and add a `/generate-video` route similar to `/generate-image`.

### Add Whisper voice transcription
Replace the browser Speech Recognition in `ChatInput.jsx` with a call to `/api/chat/whisper` that forwards audio blobs to OpenAI's Whisper API.

---

## 📝 License

MIT — build whatever you want with this.
