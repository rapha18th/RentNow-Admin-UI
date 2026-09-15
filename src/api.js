import { idToken } from './firebase'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:7860').replace(/\/$/, '')

async function req(path, opts = {}) {
  const token = await idToken()
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(opts.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  get: (p) => req(p),
  post: (p, body) => req(p, { method: 'POST', body: JSON.stringify(body || {}) }),
};
