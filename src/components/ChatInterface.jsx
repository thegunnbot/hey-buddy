import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, X, Bot, User, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { sendChatMessage, uploadTranscript } from '../api'

const SUGGESTED_PROMPTS = [
  { label: '📋 What should I do today?', text: 'What should I focus on today with my champions?' },
  { label: '⚠️ What am I behind on?', text: 'Which champions am I overdue on, and what should I do about them?' },
  { label: '➕ Add a new champion', text: "I'd like to add a new champion." },
  { label: '📄 Upload a call transcript', text: "I have a call transcript I'd like you to process." },
  { label: '👋 Hey buddy', text: 'Hey buddy' },
]

const HEY_BUDDY_EASTER_EGG = `I'm not your buddy, friend. 🇨🇦\n\nhttps://youtu.be/m1JakODvYhA?si=X7fqez78mIIB9EgA`

// ── File type config ───────────────────────────────────────────────────────────

const FILE_TYPES = {
  text:  { icon: '📄', label: 'Text / Markdown', extracting: 'Reading transcript…',  done: (m) => `Transcript ready · ${m.wordCount?.toLocaleString()} words` },
  docx:  { icon: '📝', label: 'Word document',   extracting: 'Extracting from Word doc…', done: (m) => `Document extracted · ${m.wordCount?.toLocaleString()} words` },
  pdf:   { icon: '📋', label: 'PDF',             extracting: 'Parsing PDF…',          done: (m) => `PDF parsed · ${m.wordCount?.toLocaleString()} words` },
  audio: { icon: '🎙️', label: 'Audio recording', extracting: 'Transcribing audio with Whisper…', done: (m) => `Audio transcribed · ${m.wordCount?.toLocaleString()} words` },
  video: { icon: '🎬', label: 'Video recording', extracting: 'Transcribing video audio with Whisper…', done: (m) => `Video transcribed · ${m.wordCount?.toLocaleString()} words` },
}

const ACCEPTED_EXTENSIONS = '.txt,.md,.markdown,.pdf,.doc,.docx,.mp3,.m4a,.ogg,.wav,.aac,.opus,.mp4,.mov,.webm,.avi'

// ── Subcomponents ──────────────────────────────────────────────────────────────

function Message({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={clsx('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ background: isUser ? '#59bbb7' : '#1c2c3b' }}
      >
        {isUser
          ? <User className="h-3.5 w-3.5 text-white" />
          : <Bot className="h-3.5 w-3.5 text-white" />}
      </div>
      <div className={clsx('max-w-[80%] rounded-2xl px-4 py-2.5', isUser ? 'rounded-tr-sm' : 'rounded-tl-sm')}
        style={{ background: isUser ? '#59bbb7' : '#fff', border: isUser ? 'none' : '1px solid #e0e0e0' }}>
        {message.attachment && (
          <div className="mb-2 flex items-center gap-1.5 text-xs opacity-70">
            <Paperclip className="h-3 w-3" />
            <span>{message.attachment}</span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap" style={{ color: isUser ? '#0f1924' : '#0f1924' }}>
          {message.content}
        </p>
      </div>
    </div>
  )
}

function FileAttachmentBadge({ file, onRemove }) {
  const meta = FILE_TYPES[file.fileType] || FILE_TYPES.text
  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2"
      style={{ background: file.extracting ? 'rgba(78,112,248,0.08)' : 'rgba(89,187,183,0.1)', border: `1px solid ${file.extracting ? 'rgba(78,112,248,0.3)' : 'rgba(89,187,183,0.3)'}` }}>
      <span className="text-sm">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: '#0f1924' }}>{file.name}</p>
        <p className="text-xs" style={{ color: file.extracting ? '#4e70f8' : '#59bbb7' }}>
          {file.extracting
            ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin inline" /> {meta.extracting}</span>
            : meta.done(file)}
        </p>
      </div>
      {!file.extracting && onRemove && (
        <button onClick={onRemove}>
          <X className="h-3.5 w-3.5" style={{ color: '#848d9a' }} />
        </button>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ChatInterface({ onDataChanged, compact = false, feedbackInjection = null }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingFile, setPendingFile] = useState(null) // { name, text, fileType, wordCount, extracting }
  const [showPrompts, setShowPrompts] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const messagesRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const dragCounter = useRef(0)

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  // Feedback injection from action card copies
  useEffect(() => {
    if (!feedbackInjection) return
    const { championName, championId, message, channel } = feedbackInjection
    const prompt = `You copied a ${channel === 'long' ? 'email' : 'text message'} for **${championName}**. Let me know what you actually sent and I'll learn from it — or just ignore this.`
    setMessages(prev => [...prev, { role: 'assistant', content: prompt, feedbackContext: { championId, suggestedText: message, channel } }])
    setShowPrompts(false)
  }, [feedbackInjection?.key])

  // ── File processing ──────────────────────────────────────────────────────────

  const processFile = useCallback(async (file) => {
    // Detect type for immediate UI feedback
    const ext = file.name.split('.').pop()?.toLowerCase()
    const extTypeMap = { txt: 'text', md: 'text', markdown: 'text', pdf: 'pdf', doc: 'docx', docx: 'docx', mp3: 'audio', m4a: 'audio', ogg: 'audio', wav: 'audio', aac: 'audio', opus: 'audio', mp4: 'video', mov: 'video', webm: 'video', avi: 'video' }
    const guessedType = extTypeMap[ext] || 'text'

    setPendingFile({ name: file.name, text: null, fileType: guessedType, extracting: true })
    setShowPrompts(false)

    try {
      const result = await uploadTranscript(file)
      if (result.error) {
        setPendingFile(null)
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Couldn't process ${file.name}: ${result.error}` }])
        return
      }
      setPendingFile({
        name: file.name,
        text: result.text,
        fileType: result.fileType || guessedType,
        wordCount: result.wordCount,
        charCount: result.charCount,
        extracting: false,
      })
      // Pre-fill input if empty
      const defaultPrompt = result.fileType === 'audio' || result.fileType === 'video'
        ? `I've attached a recording. Please transcribe and extract any champion intelligence from it.`
        : `I've attached a file. Please process it and extract any champion intelligence.`
      setInput(prev => prev || defaultPrompt)
      textareaRef.current?.focus()
    } catch (err) {
      setPendingFile(null)
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Upload failed: ${err.message}` }])
    }
  }, [])

  // ── Drag and drop ────────────────────────────────────────────────────────────

  function handleDragEnter(e) {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.items?.length) setIsDragOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragOver(false)
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(e) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  // ── Send ─────────────────────────────────────────────────────────────────────

  async function handleSend(text = input, transcript = null) {
    const content = text.trim()
    if (!content && !pendingFile) return

    const userMsg = {
      role: 'user',
      content,
      attachment: pendingFile ? `${FILE_TYPES[pendingFile.fileType]?.icon || '📎'} ${pendingFile.name}` : null,
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    const fileText = pendingFile?.text || transcript
    setPendingFile(null)
    setShowPrompts(false)
    setLoading(true)

    // Feedback loop — check if replying to a feedback prompt
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.feedbackContext)
    if (lastAssistantMsg?.feedbackContext) {
      const { championId, suggestedText, channel } = lastAssistantMsg.feedbackContext
      fetch('/api/profile/sent-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ champion_id: championId, suggested_text: suggestedText, actual_text: content, channel }),
      }).catch(() => {})
    }

    // Easter egg 🇨🇦
    if (content.trim().toLowerCase() === 'hey buddy') {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: HEY_BUDDY_EASTER_EGG }])
        setLoading(false)
      }, 600)
      return
    }

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const result = await sendChatMessage(apiMessages, fileText)
      setMessages(prev => [...prev, { role: 'assistant', content: result.message || result.error || 'Something went wrong.' }])
      if (result.wroteData && onDataChanged) onDataChanged()
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  const isEmpty = messages.length === 0
  const canSend = (input.trim() || pendingFile) && !pendingFile?.extracting

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className={clsx('flex flex-col overflow-hidden rounded-2xl relative', compact ? 'h-full' : 'h-80')}
      style={{ background: '#f0f0f0', border: `1px solid ${isDragOver ? '#59bbb7' : '#e0e0e0'}`, transition: 'border-color 0.15s' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl pointer-events-none"
          style={{ background: 'rgba(89,187,183,0.12)', border: '2px dashed #59bbb7' }}>
          <p className="text-2xl mb-2">📂</p>
          <p className="text-sm font-semibold" style={{ color: '#59bbb7' }}>Drop to process</p>
          <p className="text-xs mt-1" style={{ color: '#848d9a' }}>Transcripts · Word · PDF · Audio · Video</p>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-auto px-4 py-4 space-y-4">
        {isEmpty && showPrompts && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: '#1c2c3b' }}>
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-sm" style={{ color: '#505862' }}>
                Hi Rich 👋 What would you like to work on?
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pl-10">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleSend(p.text)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{ background: 'rgba(89,187,183,0.12)', color: '#59bbb7', border: '1px solid rgba(89,187,183,0.3)' }}
                  onMouseEnter={e => e.target.style.background = 'rgba(89,187,183,0.2)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(89,187,183,0.12)'}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Drop hint when empty */}
            <p className="pl-10 text-xs" style={{ color: '#c0c0c0' }}>
              💡 Drag and drop a file anywhere here — transcripts, recordings, Word docs, PDFs
            </p>
          </div>
        )}

        {messages.map((msg, i) => <Message key={i} message={msg} />)}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: '#1c2c3b' }}>
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm px-4 py-2.5"
              style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#59bbb7' }} />
              <span className="text-sm" style={{ color: '#848d9a' }}>Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid #e0e0e0', background: '#fff' }}>
        {pendingFile && (
          <FileAttachmentBadge
            file={pendingFile}
            onRemove={() => setPendingFile(null)}
          />
        )}
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-lg p-2 transition-colors"
            style={{ color: '#848d9a' }}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything, or drop a file…"
            rows={1}
            className="flex-1 resize-none rounded-xl px-3 py-2 text-sm max-h-32 focus:outline-none"
            style={{ background: '#f0f0f0', border: '1px solid #e0e0e0', minHeight: '38px', color: '#0f1924' }}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!canSend}
            className="shrink-0 rounded-xl p-2 transition-colors disabled:opacity-40"
            style={{ background: '#59bbb7' }}
          >
            <Send className="h-4 w-4" style={{ color: '#0f1924' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
