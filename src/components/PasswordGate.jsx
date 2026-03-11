import { useState, useEffect } from 'react'

const SESSION_KEY = 'hb_authed'

export default function PasswordGate({ children }) {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      setAuthed(true)
    }
    setChecking(false)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, 'true')
        setAuthed(true)
      } else {
        setError('Incorrect password.')
        setPassword('')
      }
    } catch {
      setError('Could not connect. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return null

  if (authed) return children

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1924' }}>
      <div className="w-full max-w-sm px-8 py-10 rounded-2xl" style={{ backgroundColor: '#1a2736' }}>
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-white text-xl font-semibold">Hey Buddy</h1>
          <p className="text-gray-400 text-sm mt-1">Enter your passphrase to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Passphrase"
            autoFocus
            className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 text-sm outline-none focus:ring-2"
            style={{ backgroundColor: '#0f1924', borderColor: '#59bbb7', border: '1px solid #2a3a4a' }}
            onFocus={e => e.target.style.borderColor = '#59bbb7'}
            onBlur={e => e.target.style.borderColor = '#2a3a4a'}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-lg text-white font-medium text-sm transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#59bbb7' }}
          >
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
