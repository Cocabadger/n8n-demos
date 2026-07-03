import { useEffect, useState } from 'react'
import './App.css'

// Live n8n demo console. Design rule: EVERY side effect is visible on this
// page — human-readable results, not raw JSON; a visitor never needs access
// to a private Telegram or CRM to believe it worked.

const N8N = 'https://n8n-production-2e93.up.railway.app'
// Public Telegram channel (readable in a browser without an account).
// Set to '' to hide the links until the channel exists.
const TG_CHANNEL = 'public_test_cocabadger'

interface Execution {
  id: string
  workflowName: string
  status: string
  startedAt: string
  durationMs: number | null
}

type Res = Record<string, unknown> | null

function TgBubble({ text, sent, note }: { text: string; sent: boolean; note?: string }) {
  return (
    <div className="tg">
      <div className="tg-head">Telegram</div>
      <div className={`tg-bubble ${sent ? '' : 'tg-muted'}`}>{text}</div>
      <div className={`tg-status ${sent ? 'ok' : ''}`}>
        {sent ? '✓ delivered' : note || 'not sent'}
        {sent && TG_CHANNEL && <> · <a href={`https://t.me/s/${TG_CHANNEL}`} target="_blank" rel="noreferrer">see it in the public channel</a></>}
      </div>
    </div>
  )
}

export default function App() {
  const [watchdog, setWatchdog] = useState<Res>(null)
  const [leadRes, setLeadRes] = useState<Res>(null)
  const [sumRes, setSumRes] = useState<Res>(null)
  const [svorRes, setSvorRes] = useState<Res>(null)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [lead, setLead] = useState({ name: '', email: '', company: '' })
  const [text, setText] = useState('')
  const [feed, setFeed] = useState<Execution[]>([])
  const [tgFeed, setTgFeed] = useState<{ text: string; at: string | null }[]>([])
  const [tgPhoto, setTgPhoto] = useState<string | null>(null)

  const call = async (id: string, setter: (r: Res) => void, fn: () => Promise<Response>) => {
    setBusy((b) => ({ ...b, [id]: true }))
    setter(null)
    try {
      const r = await fn()
      setter(await r.json().catch(() => ({ error: `HTTP ${r.status}` })))
    } catch (e) {
      setter({ error: String(e) })
    } finally {
      setBusy((b) => ({ ...b, [id]: false }))
    }
  }

  useEffect(() => {
    let stop = false
    const tick = async () => {
      try {
        const r = await fetch('/api/executions')
        if (r.ok && !stop) setFeed(await r.json())
      } catch { /* best-effort */ }
      try {
        const r2 = await fetch('/api/telegram')
        if (r2.ok && !stop) {
          const d = await r2.json()
          setTgFeed(Array.isArray(d) ? d : d.items || [])
          if (!Array.isArray(d) && d.photo) setTgPhoto(d.photo)
        }
      } catch { /* best-effort */ }
    }
    tick()
    const t = setInterval(tick, 5000)
    return () => { stop = true; clearInterval(t) }
  }, [])

  // Randomized fake import event — a new bank/size/verdict on every click.
  const makeSample = () => {
    const banks = [
      { bank: 'mbank', file: 'statement-06-2026.csv' },
      { bank: 'wise', file: 'wise-eur-export.csv' },
      { bank: 'monobank', file: 'mono-black-uah.csv' },
      { bank: 'pekao', file: 'pekao-pln-czerwiec.csv' },
      { bank: 'revolut', file: 'revolut-business.csv' },
      { bank: 'binance', file: 'binance-usdt-trades.csv' },
    ]
    const b = banks[Math.floor(Math.random() * banks.length)]
    return {
      bank: b.bank,
      inserted: 5 + Math.floor(Math.random() * 55),
      duplicates: Math.floor(Math.random() * 5),
      checksum: Math.random() > 0.2,
      filename: b.file,
    }
  }

  return (
    <main>
      <header>
        <h1>n8n demos — live automation console</h1>
        <p>
          Every card runs a <strong>real workflow</strong> on a self-hosted n8n instance
          (Docker on Railway) — and everything each workflow does is shown right here on
          the page. By <a href="https://www.linkedin.com/in/artem-taranenko-13472351">Artem Taranenko</a> ·{' '}
          <a href="https://github.com/Cocabadger/n8n-demos">GitHub (source + workflow JSONs)</a>
        </p>
      </header>

      <div className="layout">
      <div className="content">

      <section className="grid">
        {/* 1 — FX Rate Watchdog */}
        <article className="card">
          <h2>1 · FX Rate Watchdog</h2>
          <div className="stack">{['NBU API', 'Binance P2P', 'JS Code node', 'IF', 'Telegram', 'Cron'].map((s) => <span key={s}>{s}</span>)}</div>
          <p>Fetches the official USD/UAH rate (National Bank of Ukraine) and the live USDT
             price from the Binance P2P order book, computes the cash-out premium in a
             JavaScript node — and alerts Telegram only when it crosses 3%. Runs daily at
             09:00; the button triggers it right now.</p>
          <button disabled={busy.w} onClick={() => call('w', setWatchdog, () => fetch(`${N8N}/webhook/rate-watchdog`))}>
            {busy.w ? 'Running…' : 'Run'}
          </button>
          {watchdog && !watchdog.error && (
            <div className="outcome">
              <div className="nums">
                <div><label>official USD/UAH</label><b>{String(watchdog.official_usd_uah)}</b></div>
                <div><label>P2P USDT/UAH</label><b>{String(watchdog.p2p_usdt_uah)}</b></div>
                <div><label>premium</label><b className={watchdog.alert ? 'err' : 'ok'}>{String(watchdog.premium_pct)}%</b></div>
              </div>
              <TgBubble text={`🚨 ${String(watchdog.message)}`} sent={Boolean(watchdog.alert)}
                        note="not sent — premium is below the 3% alert threshold (that's the watchdog working as intended)" />
            </div>
          )}
          {watchdog?.error != null && <div className="errbox">{String(watchdog.error)}</div>}
        </article>

        {/* 2 — Lead → HubSpot */}
        <article className="card">
          <h2>2 · Lead → HubSpot</h2>
          <div className="stack">{['Webhook', 'HubSpot CRM', 'Claude Haiku 4.5', 'Telegram'].map((s) => <span key={s}>{s}</span>)}</div>
          <p>Creates a contact in a HubSpot test portal (CRM as the single source of
             truth), asks Claude for a one-line personalized welcome, and notifies
             Telegram. Fill the form — the created contact is shown below.</p>
          <div className="form">
            <input placeholder="Name" value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} />
            <input placeholder="Email (any)" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} />
            <input placeholder="Company" value={lead.company} onChange={(e) => setLead({ ...lead, company: e.target.value })} />
            <button disabled={busy.l || !lead.name} onClick={() =>
              call('l', setLeadRes, () => fetch(`${N8N}/webhook/lead`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead),
              }))}>
              {busy.l ? 'Running…' : 'Run'}
            </button>
          </div>
          {leadRes && !leadRes.error && (
            <div className="outcome">
              <div className="crm">
                <div className="crm-head">HubSpot · Contacts</div>
                <div className="crm-row">
                  <div className="avatar">{String(leadRes.name || '?').slice(0, 1).toUpperCase()}</div>
                  <div>
                    <b>{String(leadRes.name)}</b>
                    <div className="muted">{String(leadRes.company)}</div>
                  </div>
                  <div className={`pill ${leadRes.status === 'created' ? 'ok' : ''}`}>
                    {leadRes.status === 'created' ? `created · id ${leadRes.hubspot_contact_id}` : 'already existed'}
                  </div>
                </div>
              </div>
              <div className="claude"><label>Claude's welcome line</label>“{String(leadRes.greeting)}”</div>
              <TgBubble text={String(leadRes.message)} sent />
            </div>
          )}
          {leadRes?.error != null && <div className="errbox">{String(leadRes.error)}</div>}
        </article>

        {/* 3 — AI Summarizer */}
        <article className="card">
          <h2>3 · AI Summarizer</h2>
          <div className="stack">{['Webhook', 'Claude Haiku 4.5', 'JSON contract'].map((s) => <span key={s}>{s}</span>)}</div>
          <p>Paste any text — an LLM step inside the workflow returns a structured
             summary. The prompt enforces a strict JSON contract; input is capped for
             cost control.</p>
          <div className="form">
            <textarea rows={4} placeholder="Paste ≥40 characters — meeting notes, an email thread…"
                      value={text} onChange={(e) => setText(e.target.value)} />
            <button disabled={busy.s || text.length < 40} onClick={() =>
              call('s', setSumRes, () => fetch(`${N8N}/webhook/summarize`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
              }))}>
              {busy.s ? 'Running…' : text.length < 40 ? `Run (${40 - text.length} chars to go)` : 'Run'}
            </button>
          </div>
          {sumRes && !sumRes.error && (
            <div className="outcome">
              <div className="claude"><label>TL;DR</label>{String(sumRes.tldr)}</div>
              {Array.isArray(sumRes.key_points) && sumRes.key_points.length > 0 && (
                <div className="lst"><label>Key points</label><ul>{(sumRes.key_points as string[]).map((k, i) => <li key={i}>{k}</li>)}</ul></div>
              )}
              {Array.isArray(sumRes.action_items) && sumRes.action_items.length > 0 && (
                <div className="lst"><label>Action items</label><ul>{(sumRes.action_items as string[]).map((k, i) => <li key={i}>{k}</li>)}</ul></div>
              )}
            </div>
          )}
          {sumRes?.error != null && <div className="errbox">{String(sumRes.error)}</div>}
        </article>

        {/* 4 — svor production hook */}
        <article className="card">
          <h2>4 · svor → notify (production)</h2>
          <div className="stack">{['svor webhook', 'JS Code node', 'Telegram'].map((s) => <span key={s}>{s}</span>)}</div>
          <p><a href="https://svor.vercel.app">svor</a> — an AI cashflow manager I built and
             run — calls this workflow automatically on every bank-statement import.
             Press the button to simulate exactly the event svor sends in production.</p>
          <button disabled={busy.v} onClick={() => {
            const sample = makeSample()
            setSvorRes({ _sample: sample })
            call('v', (r) => setSvorRes({ ...(r || {}), _sample: sample }), () =>
              fetch(`${N8N}/webhook/svor-import`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sample, demo: true }),
              }))
          }}>
            {busy.v ? 'Running…' : 'Simulate an import event'}
          </button>
          {svorRes?._sample != null && !busy.v && (
            <div className="outcome">
              <div className="lst"><label>event svor sent</label>
                <pre className="mini">{JSON.stringify(svorRes._sample, null, 1)}</pre>
              </div>
              <TgBubble
                text={`svor import: ${(svorRes._sample as Record<string, unknown>).bank} — ${(svorRes._sample as Record<string, unknown>).inserted} rows in, ${(svorRes._sample as Record<string, unknown>).duplicates} duplicates, ${(svorRes._sample as Record<string, unknown>).checksum ? 'checksum OK' : 'CHECKSUM MISMATCH'} (${(svorRes._sample as Record<string, unknown>).filename})`}
                sent />
            </div>
          )}
        </article>
      </section>

      <section className="arch">
        <h2>Architecture — how each card works</h2>
        <p className="hint">Node-by-node flow of every workflow above. JSON exports live in the{' '}
          <a href="https://github.com/Cocabadger/n8n-demos/tree/main/workflows">repo</a>.</p>

        <div className="arch-item">
          <h3>1 · FX Rate Watchdog</h3>
          <div className="flow">
            {['Webhook / Cron 09:00', 'HTTP: NBU official rate', 'HTTP: Binance P2P order book (POST)', 'Code (JS): median price + premium %', 'IF premium > 3%', 'Telegram alert'].map((n, i) => (
              <span key={i} className="flow-node">{n}</span>
            ))}
          </div>
          <p className="arch-note">Two triggers share one chain; the webhook branch also returns the numbers to this page. The JS node is where low-code stops being no-code: real logic lives in a Code node.</p>
        </div>

        <div className="arch-item">
          <h3>2 · Lead → HubSpot</h3>
          <div className="flow">
            {['Webhook (form POST)', 'HTTP: HubSpot create contact', 'HTTP: Claude — one-line welcome', 'Code (JS): shape the response', 'Respond to page + Telegram'].map((n, i) => (
              <span key={i} className="flow-node">{n}</span>
            ))}
          </div>
          <p className="arch-note">CRM as the single source of truth: the contact record is created first, enrichment (LLM greeting) and notifications follow. Errors continue the flow — a failed greeting never loses the lead.</p>
        </div>

        <div className="arch-item">
          <h3>3 · AI Summarizer</h3>
          <div className="flow">
            {['Webhook (text POST)', 'HTTP: Claude Haiku 4.5 (JSON-contract prompt)', 'Code (JS): validate the contract', 'Respond to page'].map((n, i) => (
              <span key={i} className="flow-node">{n}</span>
            ))}
          </div>
          <p className="arch-note">The LLM is just another node: strict JSON contract in the prompt, validation in code, input capped at 8k chars, smallest adequate model (Haiku) — cost control by design.</p>
        </div>

        <div className="arch-item">
          <h3>4 · svor → notify (production)</h3>
          <div className="flow">
            {['svor backend (FastAPI, fire-and-forget task after import)', 'Webhook', 'Code (JS): format the summary', 'Telegram'].map((n, i) => (
              <span key={i} className="flow-node">{n}</span>
            ))}
          </div>
          <p className="arch-note">The boundary done right: the product itself is code (FastAPI, 166 tests) — n8n handles the operational glue around it. The hook is optional, best-effort and never slows an import.</p>
        </div>

        <h2>Why n8n at all — couldn't this be plain code?</h2>
        <p className="why">
          It could — a webhook is just an HTTP POST, and half of this portfolio (<a href="https://svor.vercel.app">svor</a> itself)
          <em> is</em> plain code. n8n earns its place for the layer around integrations:
        </p>
        <ul className="why-list">
          <li><b>Maintainability by non-developers.</b> A script can only be changed by whoever wrote it; a visual workflow can be read, debugged and edited by an operator. Automations in companies outlive their authors — the canvas is the code <em>and</em> its documentation.</li>
          <li><b>500+ prebuilt connectors.</b> "Create a HubSpot contact" in raw code means OAuth, retries, pagination, error handling. Here it is one node where all of that is already solved.</li>
          <li><b>Operations for free.</b> Execution history (the live feed on this page is literally its API), retries, encrypted credential store, cron scheduling — none of it had to be written.</li>
          <li><b>And an honest boundary.</b> Complex domain logic, performance-critical paths, versioned business rules — that's code territory. Demo #4 shows the split I'd defend in production: <b>product = code, operational glue = n8n</b>.</li>
        </ul>
      </section>

      <section className="feed">
        <h2>Live executions <span className="dot" /></h2>
        <p className="hint">Straight from the n8n API via a key-holding proxy — your Run appears here within ~5s.</p>
        <table>
          <thead><tr><th>Workflow</th><th>Status</th><th>Started</th><th>Duration</th></tr></thead>
          <tbody>
            {feed.map((e) => (
              <tr key={e.id}>
                <td>{e.workflowName}</td>
                <td className={e.status === 'success' ? 'ok' : e.status === 'error' ? 'err' : ''}>{e.status}</td>
                <td>{new Date(e.startedAt).toLocaleTimeString()}</td>
                <td>{e.durationMs != null ? `${e.durationMs} ms` : '—'}</td>
              </tr>
            ))}
            {feed.length === 0 && <tr><td colSpan={4}>no executions yet — press Run above</td></tr>}
          </tbody>
        </table>
      </section>

      </div>

      <aside className="chatpane">
        <div className="chat">
          <div className="chat-head">
            <div className="chat-avatar">{tgPhoto ? <img src={tgPhoto} alt="" /> : 'S'}</div>
            <div className="chat-title">
              <b>svor ops feed</b>
              <div className="chat-sub">public channel · written by the workflows</div>
            </div>
            <a className="chat-open" href={`https://t.me/s/${TG_CHANNEL}`} target="_blank" rel="noreferrer">open ↗</a>
          </div>
          <div className="chat-body">
            {tgFeed.length === 0 && <div className="chat-empty">connecting to the channel…</div>}
            {[...tgFeed].reverse().map((m, i) => (
              <div key={i} className="msg">
                <div className="msg-text">{m.text}</div>
                {m.at && <div className="msg-time">{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
              </div>
            ))}
          </div>
          <div className="chat-foot">Press Run on any card — the message lands here within seconds.</div>
        </div>
      </aside>
      </div>

      <footer>
        Self-hosted n8n · Railway · built end-to-end with Claude Code ·{' '}
        <a href="https://svor.vercel.app">svor</a> — the production app behind demo #4
      </footer>
    </main>
  )
}
