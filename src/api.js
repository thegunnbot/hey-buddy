const BASE = '/api'

export async function fetchChampions({ includeArchived = false } = {}) {
  const url = includeArchived ? `${BASE}/champions?includeArchived=true` : `${BASE}/champions`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch champions')
  return res.json()
}

export async function fetchChampion(id) {
  const res = await fetch(`${BASE}/champions/${id}`)
  if (!res.ok) throw new Error('Failed to fetch champion')
  return res.json()
}

export async function createChampion(data) {
  const res = await fetch(`${BASE}/champions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function sendChatMessage(messages, transcript = null) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, transcript }),
  })
  return res.json()
}

export async function uploadTranscript(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  return res.json()
}

export async function updateTriggerStatus(triggerId, status) {
  const res = await fetch(`${BASE}/champions/triggers/${triggerId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return res.json()
}
