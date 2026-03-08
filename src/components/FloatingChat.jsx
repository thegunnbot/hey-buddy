import { useState } from 'react'
import { MessageSquarePlus, X, Bug } from 'lucide-react'
import ChatInterface from './ChatInterface'
import FeedbackForm from './FeedbackForm'

export default function FloatingChat({ onDataChanged }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('chat') // 'chat' | 'feedback'

  const handleClose = () => {
    setOpen(false)
    setMode('chat')
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105"
        style={{ background: '#59bbb7' }}
        title="Open Hey Buddy"
      >
        {open
          ? <X className="h-5 w-5" style={{ color: '#0f1924' }} />
          : <MessageSquarePlus className="h-5 w-5" style={{ color: '#0f1924' }} />
        }
      </button>

      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-96 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ height: mode === 'feedback' ? 'auto' : '480px', maxHeight: '80vh', border: '1px solid #28323f' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: '#0f1924' }}>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: '#59bbb7' }} />
              <span className="text-sm font-semibold text-white">Hey Buddy</span>
            </div>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: '#1c2c3b' }}>
              <button
                onClick={() => setMode('chat')}
                className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
                style={{
                  background: mode === 'chat' ? '#28323f' : 'transparent',
                  color: mode === 'chat' ? '#fff' : '#848d9a',
                }}
              >
                Chat
              </button>
              <button
                onClick={() => setMode('feedback')}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
                style={{
                  background: mode === 'feedback' ? '#28323f' : 'transparent',
                  color: mode === 'feedback' ? '#ee6c5b' : '#848d9a',
                }}
              >
                <Bug className="h-3 w-3" />
                Feedback
              </button>
            </div>
            <button onClick={handleClose} style={{ color: '#848d9a' }} className="hover:text-white transition-colors ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden" style={{ background: '#fff' }}>
            {mode === 'chat'
              ? <ChatInterface onDataChanged={onDataChanged} compact />
              : <FeedbackForm submittedBy="rich" onClose={handleClose} />
            }
          </div>
        </div>
      )}
    </>
  )
}
