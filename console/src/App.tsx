import { useEffect, useState } from 'react'
import './App.css'

// Live n8n demo console: every card runs a REAL workflow on a self-hosted
// n8n instance; the feed below shows executions as they happen.

const N8N = 'https://n8n-production-2e93.up.railway.app'

interface Execution {
  id: string
  workflowName: string
  status: string
  startedAt: string
  durationMs: number | null
}

const CARDS = [
  {
    id: 'watchdog',
    title: '1 · FX Rate Watchdog',
    stack: ['NBU API', 'Binance P2P', 'JS Code node', 'IF', 'Telegram', 'Cron'],
    desc: 'Pulls the official USD/UAH rate (National Bank of Ukraine) and the live USDT price from the Binance P2P order book, computes the cash-out premium in a JavaScript node, and alerts Telegram when it goes anomalous (>3%). Also runs daily at 09:00.',
  },
  {
    id: 'lead',
    title: '2 · Lead → HubSpot',
    stack: ['Webhook', 'HubSpot CRM', 'Claude LLM', 'Telegram'],
    desc: 'Creates a contact in HubSpot (CRM as the single source of truth), asks Claude for a one-line personalized welcome, and notifies Telegram. Fill the mini-form and press Run.',
  },
  {
    id: 'summarize',
    title: '3 · AI Summarizer',
    stack: ['Webhook', 'Claude LLM', 'JSON contract'],
    desc: 'Paste any text — an LLM step inside the workflow returns a structured summary: TL;DR, key points, action items. The prompt enforces a strict JSON contract; input is capped for cost control.',
  },
  {
    id: 'svor',
    title: '4 · svor → notify (production)',
    stack: ['svor webhook', 'JS Code node', 'Telegram'],
    desc: 'Not a demo — live plumbing: svor.vercel.app (an AI cashflow manager I built and run) calls this workflow on every bank-statement import; Telegram gets the bank, row count and the balance-checksum verdict.',
    noRun: true,
  },
]

function Result({ data }: { data: unknown }) {
  if (data === undefined || data === null) return null
  return <pre className="result">{JSON.stringify(data, null, 2)}</pre>
}

export default function App() {
  const [results, setResults] = useState<Record<string, unknown>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [lead, setLead] = useState({ name: '', email: '', company: '' })
  const [text, setText] = useState('')
  const [feed, setFeed] = useState<Execution[]>([])

  const run = async (id: string, fn: () => Promise<Response>) => {
    setBusy((b) => ({ ...b, [id]: true }))
    try {
      const r = await fn()
      const json = await r.json().catch(() => ({ status: r.status }))
      setResults((res) => ({ ...res, [id]: json }))
    } catch (e) {
      setResults((res) => ({ ...res, [id]: { error: String(e) } }))
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
      } catch { /* feed is best-effort */ }
    }
    tick()
    const t = setInterval(tick, 5000)
    return () => { stop = true; clearInterval(t) }
  }, [])

  return (
    <main>
      <header>
        <h1>n8n demos — live automation console</h1>
        <p>
          Every card below runs a <strong>real workflow</strong> on a self-hosted n8n
          instance (Docker on Railway). Press Run and watch the execution appear in the
          live feed. By <a href="https://www.linkedin.com/in/artem-taranenko-13472351">Artem Taranenko</a> ·{' '}
          <a href="https://github.com/Cocabadger/n8n-demos">source & workflow JSONs</a>
        </p>
      </header>

      <section className="grid">
        {CARDS.map((c) => (
          <article key={c.id} className="card">
            <h2>{c.title}</h2>
            <div className="stack">{c.stack.map((s) => <span key={s}>{s}</span>)}</div>
            <p>{c.desc}</p>

            {c.id === 'watchdog' && (
              <button disabled={busy[c.id]} onClick={() =>
                run(c.id, () => fetch(`${N8N}/webhook/rate-watchdog`))}>
                {busy[c.id] ? 'Running…' : 'Run'}
              </button>
            )}

            {c.id === 'lead' && (
              <div className="form">
                <input placeholder="Name" value={lead.name}
                       onChange={(e) => setLead({ ...lead, name: e.target.value })} />
                <input placeholder="Email" value={lead.email}
                       onChange={(e) => setLead({ ...lead, email: e.target.value })} />
                <input placeholder="Company" value={lead.company}
                       onChange={(e) => setLead({ ...lead, company: e.target.value })} />
                <button disabled={busy[c.id] || !lead.name} onClick={() =>
                  run(c.id, () => fetch(`${N8N}/webhook/lead`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(lead),
                  }))}>
                  {busy[c.id] ? 'Running…' : 'Run'}
                </button>
              </div>
            )}

            {c.id === 'summarize' && (
              <div className="form">
                <textarea rows={4} placeholder="Paste any text — meeting notes, an email thread…"
                          value={text} onChange={(e) => setText(e.target.value)} />
                <button disabled={busy[c.id] || text.length < 40} onClick={() =>
                  run(c.id, () => fetch(`${N8N}/webhook/summarize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                  }))}>
                  {busy[c.id] ? 'Running…' : 'Run'}
                </button>
              </div>
            )}

            {c.noRun && <div className="prod">runs on real product events</div>}

            <Result data={results[c.id]} />
          </article>
        ))}
      </section>

      <section className="feed">
        <h2>Live executions <span className="dot" /></h2>
        <p className="hint">Straight from the n8n API via a key-holding proxy — refreshed every 5s.</p>
        <table>
          <thead>
            <tr><th>Workflow</th><th>Status</th><th>Started</th><th>Duration</th></tr>
          </thead>
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

      <footer>
        Self-hosted n8n · Railway · built end-to-end with Claude Code ·{' '}
        <a href="https://svor.vercel.app">svor</a> — the production app behind demo #4
      </footer>
    </main>
  )
}
