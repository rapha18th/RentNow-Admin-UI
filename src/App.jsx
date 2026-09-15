import React, { useEffect, useState } from 'react'
import { auth, login, logout } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { api } from './api'

const TABS = ['Dashboard', 'Verifications', 'Listings', 'Viewings', 'Payments', 'Wallets', 'Leases', 'Search', 'Audit']

function useFetch(tab, user) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  async function load() {
    if (!user) return
    setError('')
    try {
      if (tab === 'Dashboard') setData(await api.get('/api/dashboard'))
      if (tab === 'Verifications') setData(await api.get('/api/verifications'))
      if (tab === 'Listings') setData(await api.get('/api/listings?status=pending_review'))
      if (tab === 'Viewings') setData(await api.get('/api/viewings?status=paid_appointment_pending'))
      if (tab === 'Payments') setData(await api.get('/api/payments'))
      if (tab === 'Wallets') setData(await api.get('/api/wallets'))
      if (tab === 'Leases') setData(await api.get('/api/leases'))
      if (tab === 'Audit') setData(await api.get('/api/audit'))
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [tab, user])
  async function search() {
    try { setData(await api.get('/api/search?q=' + encodeURIComponent(q))) }
    catch (e) { setError(e.message) }
  }
  return { data, error, load, q, setQ, search }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('Dashboard')
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  const { data, error, load, q, setQ, search } = useFetch(tab, user)

  if (!user) {
    return (
      <div className="wrap">
        <h1>RentNow Admin</h1>
        <p>Sign in with an allowlisted ops account.</p>
        <button onClick={login}>Sign in with Google</button>
      </div>
    )
  }

  async function act(path, body) {
    try { await api.post(path, body); await load() }
    catch (e) { alert(e.message) }
  }

  return (
    <div className="wrap">
      <header>
        <h1>RentNow Admin</h1>
        <span>{user.email}</span>
        <button onClick={logout}>Sign out</button>
      </header>
      <nav>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>
      {error && <p className="err">{error} (401: re-login, 403: not allowlisted)</p>}
      {tab === 'Search' && (
        <div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="phone, listing, viewing, payment, lease" />
          <button onClick={search}>Search</button>
        </div>
      )}
      <pre>{JSON.stringify(data, null, 2)}</pre>
      {tab === 'Verifications' && data && (
        <div>
          {(data.pending_landlords || []).map((p) => (
            <div key={p.id} className="row">
              <span>{p.id} — {(p.landlord || {}).name}</span>
              <button onClick={() => act('/api/providers/verify', { phone: p.id, approve: true })}>Verify</button>
            </div>
          ))}
        </div>
      )}
      {tab === 'Listings' && data && (
        <div>
          {(data.listings || []).map((l) => (
            <div key={l.id} className="row">
              <span>{l.id} — {l.title} ({l.status})</span>
              <button onClick={() => act('/api/listings/moderate', { listing_id: l.id, approve: true })}>Approve</button>
              <button onClick={() => act('/api/listings/moderate', { listing_id: l.id, approve: false })}>Reject</button>
            </div>
          ))}
        </div>
      )}
      {tab === 'Wallets' && (
        <button onClick={() => act('/api/payouts/run', { period: new Date().toISOString().slice(0, 7) })}>
          Run payout batch
        </button>
      )}
    </div>
  )
}
