# n8n demos — live automation portfolio

Interactive showcase of production-grade n8n workflows by **Artem Taranenko**.
Every card on the [live console](https://TODO.vercel.app) runs a real workflow
on a self-hosted n8n instance (Railway, Docker) — press **Run** and watch the
execution appear in the live feed.

## Workflows

| # | Workflow | Demonstrates | Stack |
|---|---|---|---|
| 1 | **FX Rate Watchdog** | external APIs, cron, JS logic in Code node, alerting | NBU API · Binance P2P · Telegram |
| 2 | **Lead → HubSpot** | webhooks, CRM as single source of truth, LLM in a workflow | Webhook · HubSpot · Claude · Telegram |
| 3 | **AI Summarizer** | LLM agents inside automations | Webhook · Claude |
| 4 | **svor → notify** (production) | event-driven integration with a live SaaS ([svor](https://svor.vercel.app)) | svor webhook · Telegram |

Workflow exports (JSON) live in [`workflows/`](./workflows). The console is a
small React app ([`console/`](./console)) + a serverless proxy that reads the
n8n executions API without exposing the API key.

## Architecture

```
visitor ──▶ console (Vercel) ──▶ /api proxy ──▶ n8n REST API (executions feed)
                   │
                   └── Run buttons ──▶ n8n webhooks ──▶ [NBU · Binance · HubSpot · Claude · Telegram]
```

Self-hosted n8n: Docker image on Railway, persistent volume, encrypted
credentials store. Built end-to-end with Claude Code.
