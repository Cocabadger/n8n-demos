// Vercel serverless proxy: reads the n8n executions API with the key from env
// (never exposed to the browser) and returns a trimmed feed.
export default async function handler(req, res) {
  const base = process.env.N8N_URL || 'https://n8n-production-2e93.up.railway.app';
  const key = process.env.N8N_API_KEY;
  if (!key) return res.status(503).json({ error: 'N8N_API_KEY not configured' });
  try {
    const [exRes, wfRes] = await Promise.all([
      fetch(`${base}/api/v1/executions?limit=15`, { headers: { 'X-N8N-API-KEY': key } }),
      fetch(`${base}/api/v1/workflows`, { headers: { 'X-N8N-API-KEY': key } }),
    ]);
    const ex = await exRes.json();
    const wf = await wfRes.json();
    const names = Object.fromEntries((wf.data || []).map((w) => [w.id, w.name]));
    const feed = (ex.data || []).map((e) => ({
      id: e.id,
      workflowName: names[e.workflowId] || e.workflowId,
      status: e.status,
      startedAt: e.startedAt,
      durationMs: e.stoppedAt ? new Date(e.stoppedAt) - new Date(e.startedAt) : null,
    }));
    res.setHeader('Cache-Control', 's-maxage=4');
    res.status(200).json(feed);
  } catch (e) {
    res.status(502).json({ error: 'n8n unreachable' });
  }
}
