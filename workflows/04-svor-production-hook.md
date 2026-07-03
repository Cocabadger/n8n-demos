# 4 · svor → notify (production)

**What it does:** this one is not a demo — it is live plumbing for a real
product. [svor](https://svor.vercel.app) (an AI cashflow manager I built and
run) calls this webhook whenever a bank statement is imported; the workflow
posts a summary to Telegram: which bank, how many rows, whether the
running-balance checksum reconciled.

**Why it exists:** event-driven notifications from a production SaaS —
the difference between a sandbox exercise and automation that a real system
depends on every day.

**Flow:** `Webhook (svor upload event)` → `Code (JS): format the summary` →
`Telegram`.

**Demonstrates:** integrating automations with a live product, event-driven
architecture, operational awareness (the message carries the data-quality
verdict, not just "something happened").
