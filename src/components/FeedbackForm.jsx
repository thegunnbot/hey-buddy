import { useState, useRef } from 'react'
import { Bug, Lightbulb, Paperclip, Send, CheckCircle, X } from 'lucide-react'

export default function FeedbackForm({ submittedBy = 'rich', onClose }) {
  const [type, setType] = useState('feature')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setScreenshot(ev.target.result)
      setScreenshotPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handlePaste = (e) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (!item) return
    const file = item.getAsFile()
    const reader = new FileReader()
    reader.onload = (ev) => {
      setScreenshot(ev.target.result)
      setScreenshotPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, description, screenshot, submitted_by: submittedBy }),
      })
      setSubmitted(true)
    } catch {}
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
        <CheckCircle className="h-10 w-10" style={{ color: '#59bbb7' }} />
        <p className="font-semibold" style={{ color: '#0f1924' }}>Thanks! Submitted.</p>
        <p className="text-sm" style={{ color: '#848d9a' }}>Rich will review it shortly.</p>
        <button
          onClick={onClose}
          className="mt-2 text-sm font-medium px-4 py-2 rounded-lg"
          style={{ background: '#59bbb720', color: '#59bbb7' }}
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4" onPaste={handlePaste}>
      {/* Type toggle */}
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#e0e0e0' }}>
        {[
          { value: 'bug', label: 'Bug', icon: Bug },
          { value: 'feature', label: 'Feature request', icon: Lightbulb },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setType(value)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors"
            style={{
              background: type === value ? '#0f1924' : '#fff',
              color: type === value ? '#fff' : '#848d9a',
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Title */}
      <input
        type="text"
        placeholder={type === 'bug' ? 'What went wrong?' : 'What would you like?'}
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
        style={{ borderColor: '#e0e0e0', color: '#0f1924' }}
      />

      {/* Description */}
      <textarea
        placeholder="More detail (optional)… or paste a screenshot anywhere in this panel"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={3}
        className="w-full text-sm px-3 py-2 rounded-lg border outline-none resize-none"
        style={{ borderColor: '#e0e0e0', color: '#0f1924' }}
      />

      {/* Screenshot preview */}
      {screenshotPreview && (
        <div className="relative rounded-lg overflow-hidden border" style={{ borderColor: '#e0e0e0' }}>
          <img src={screenshotPreview} alt="Screenshot" className="w-full max-h-32 object-cover" />
          <button
            onClick={() => { setScreenshot(null); setScreenshotPreview(null) }}
            className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(15,25,36,0.7)' }}
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ background: '#f0f0f0', color: '#505862' }}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach screenshot
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <button
          onClick={submit}
          disabled={!title.trim() || submitting}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40 transition-opacity"
          style={{ background: '#0f1924', color: '#fff' }}
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? 'Sending…' : 'Submit'}
        </button>
      </div>
    </div>
  )
}
