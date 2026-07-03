# 2 · Lead → HubSpot

**What it does:** the mini-form on this page fires an n8n webhook. The workflow
creates a contact in HubSpot (CRM as the single source of truth), asks Claude
for a one-line personalized welcome based on the visitor's company, sends the
result back to the page and notifies via Telegram.

**Why it exists:** the classic first automation every revenue team asks for —
no lead should ever live only in someone's inbox. Enrich-on-entry with an LLM
is the 2026 twist on it.

**Flow:** `Webhook (form POST)` → `HubSpot: create/update contact` →
`Claude: one-line personalized greeting` → `Respond to page` + `Telegram
notification`.

**Demonstrates:** inbound webhooks, CRM API integration (HubSpot), an LLM step
inside a business workflow, graceful response handling.
