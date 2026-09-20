import React, { useEffect, useState } from 'react'
import { auth, login, logout } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { api } from './api'

const TABS = ['Dashboard', 'Verifications', 'Listings', 'Viewings', 'Payments', 'Wallets', 'Leases', 'Search', 'Audit']

const PATHS = {
  Dashboard: '/api/dashboard',
  Verifications: '/api/verifications',
  Listings: '/api/listings?status=pending_review',
  Viewings: '/api/viewings?status=paid_appointment_pending',
  Payments: '/api/payments',
  Wallets: '/api/wallets',
  Leases: '/api/leases',
  Audit: '/api/audit',
}

function useData(tab, user) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function load() {
    if (!user || !PATHS[tab]) return
    setBusy(true)
    setError('')
    try {
      setData(await api.get(PATHS[tab]))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => { load() }, [tab, user]) // eslint-disable-line
  return { data, error, busy, load, setError }
}

function money(c) {
  if (c == null) return '—'
  return '$' + (c / 100).toFixed(c % 100 ? 2 : 0)
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-v">{value}</div>
      <div className="stat-l">{label}</div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('Dashboard')
  const [q, setQ] = useState('')
  const { data, error, busy, load, setError } = useData(tab, user)
  useEffect(() => onAuthStateChanged(auth, setUser), [])

  async function act(path, body, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    try {
      await api.post(path, body)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function search() {
    try {
      const r = await api.get('/api/search?q=' + encodeURIComponent(q))
      useDataSearch(r)
    } catch (e) {
      setError(e.message)
    }
  }
  const [searchRes, setSearchRes] = useState(null)
  function useDataSearch(r) { setSearchRes(r) }

  if (!user) {
    return (
      <div className="login">
        <div className="login-card">
          <div className="brand">RentNow</div>
          <p className="vision">Verified homes. Coordinated viewings. No agent commissions.</p>
          <button className="primary" onClick={() => login().catch((e) => alert(e.message))}>
            Sign in with Google
          </button>
          <p className="hint">Ops access only. Your address must be allowlisted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">RentNow <span className="sub">Ops</span></div>
        <div className="who">
          <span>{user.email}</span>
          <button className="ghost" onClick={logout}>Sign out</button>
        </div>
      </header>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'on' : ''} onClick={() => { setTab(t); setSearchRes(null) }}>
            {t}
          </button>
        ))}
      </nav>
      <main>
        {error && <p className="err">{error}</p>}
        {busy && <p className="muted">Loading.</p>}

        {tab === 'Dashboard' && data && (
          <div className="grid">
            <Stat label="Listings awaiting review" value={data.pending_listings} />
            <Stat label="Active listings" value={data.active_listings} />
            <Stat label="Viewings awaiting appointment" value={data.pending_viewings} />
            <Stat label="Disputed viewings" value={data.disputed_viewings} />
            <Stat label="Payments pending" value={data.pending_payments} />
            <Stat label="Tenants" value={data.tenants} />
            <Stat label="Landlords" value={data.landlords} />
          </div>
        )}

        {tab === 'Verifications' && data && (
          <section>
            <h2>Landlords awaiting verification</h2>
            {(data.pending_landlords || []).length === 0 && <p className="muted">Queue clear.</p>}
            {(data.pending_landlords || []).map((p) => (
              <div key={p.id} className="card">
                <div>
                  <strong>{(p.landlord || {}).name || p.id}</strong>
                  <div className="muted">{p.id} · {(p.landlord || {}).provider_type || ''}</div>
                  <div className="muted">Proof: {(p.landlord || {}).proof || '—'}</div>
                </div>
                <div className="actions">
                  <button className="primary" onClick={() => act('/api/providers/verify', { phone: p.id, approve: true })}>Verify</button>
                  <button className="danger" onClick={() => act('/api/providers/verify', { phone: p.id, approve: false })}>Reject</button>
                </div>
              </div>
            ))}
            <h2>Tenant exceptions</h2>
            {(data.tenant_exceptions || []).length === 0 && <p className="muted">None.</p>}
            {(data.tenant_exceptions || []).map((p) => (
              <div key={p.id} className="card"><span>{p.id} · {(p.tenant || {}).name || ''}</span></div>
            ))}
          </section>
        )}

        {tab === 'Listings' && data && (
          <section>
            {(data.listings || []).length === 0 && <p className="muted">Queue clear.</p>}
            {(data.listings || []).map((l) => (
              <div key={l.id} className="card">
                <div>
                  <strong>{l.title}</strong> <span className="tag">{l.id}</span>
                  <div className="muted">{l.type} · {l.suburb}, {l.city} · {money(l.rent_cents)}/mo · {l.provider_phone}</div>
                </div>
                <div className="actions">
                  <button className="primary" onClick={() => act('/api/listings/moderate', { listing_id: l.id, approve: true })}>Approve</button>
                  <button className="danger" onClick={() => act('/api/listings/moderate', { listing_id: l.id, approve: false })}>Reject</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'Viewings' && data && <Viewings list={data.viewings || []} act={act} />}
        {tab === 'Payments' && data && <Payments rows={data.payments || []} />}
        {tab === 'Wallets' && data && <Wallets data={data} act={act} />}
        {tab === 'Leases' && data && <Leases rows={data.leases || []} act={act} />}

        {tab === 'Search' && (
          <section>
            <div className="searchbar">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Phone, listing, viewing, payment, lease" />
              <button className="primary" onClick={search}>Search</button>
            </div>
            {searchRes && Object.entries(searchRes).map(([k, v]) => (
              <div key={k}>
                <h2>{k}</h2>
                <pre>{JSON.stringify(v, null, 1)}</pre>
              </div>
            ))}
          </section>
        )}

        {tab === 'Audit' && data && (
          <table>
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
            <tbody>
              {(data.audit || []).map((a, i) => (
                <tr key={i}><td>{(a.ts || '').slice(0, 16)}</td><td>{a.actor}</td><td>{a.action}</td><td>{a.entity_id}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  )
}

function Viewings({ list, act }) {
  const [when, setWhen] = useState({})
  const [note, setNote] = useState({})
  if (!list.length) return <p className="muted">Queue clear.</p>
  return (
    <section>
      {list.map((v) => (
        <div key={v.id} className="card">
          <div>
            <strong>{v.id}</strong>
            <div className="muted">Listing {v.listing_id} · Tenant {v.tenant_phone} · Landlord {v.landlord_phone}</div>
            <div className="muted">Status {v.status}{v.appointment_at ? ` · ${v.appointment_at}` : ''}</div>
            <input placeholder="Appointment time" value={when[v.id] || ''} onChange={(e) => setWhen({ ...when, [v.id]: e.target.value })} />
          </div>
          <div className="actions">
            <button className="primary" onClick={() => act('/api/viewings/appointment', { viewing_id: v.id, when: when[v.id] || '', note: note[v.id] || '' })}>Set time</button>
            <button onClick={() => act('/api/viewings/complete', { viewing_id: v.id, outcome: 'completed' })}>Complete</button>
            <button className="danger" onClick={() => act('/api/viewings/complete', { viewing_id: v.id, outcome: 'cancelled' })}>Cancel</button>
          </div>
        </div>
      ))}
    </section>
  )
}

function Payments({ rows }) {
  if (!rows.length) return <p className="muted">No payments.</p>
  return (
    <table>
      <thead><tr><th>ID</th><th>User</th><th>Type</th><th>Amount</th><th>Status</th><th>Ref</th></tr></thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id}><td>{p.id}</td><td>{p.user_phone}</td><td>{p.kind}</td><td>{money(p.amount_cents)}</td><td>{p.status}</td><td>{p.provider_ref}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

function Wallets({ data, act }) {
  return (
    <section>
      <button className="primary" onClick={() => act('/api/payouts/run', { period: new Date().toISOString().slice(0, 7) }, 'Run payout batch now?')}>
        Run payout batch
      </button>
      <div className="grid">
        {(data.balances || []).map((b) => (
          <Stat key={b.phone} label={b.phone} value={money(b.balance_cents)} />
        ))}
      </div>
      {(data.balances || []).length === 0 && <p className="muted">No earnings yet.</p>}
    </section>
  )
}

function Leases({ rows, act }) {
  if (!rows.length) return <p className="muted">No leases.</p>
  return (
    <section>
      {rows.map((l) => (
        <div key={l.id} className="card">
          <div>
            <strong>{l.id}</strong>
            <div className="muted">{l.listing_id} · {money(l.rent_cents)}/mo · {l.status}</div>
          </div>
          <div className="actions">
            <button onClick={() => act('/api/leases/status', { lease_id: l.id, status: 'sent' })}>Send</button>
            <button className="primary" onClick={() => act('/api/leases/status', { lease_id: l.id, status: 'signed' })}>Sign</button>
          </div>
        </div>
      ))}
    </section>
  )
}
