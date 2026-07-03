# 3 · AI Summarizer

**What it does:** paste any text (a meeting note, an email thread, a document)
into the box on this page — the webhook hands it to Claude inside n8n with a
structured-output prompt, and the page gets back a compact summary: TL;DR,
key points, action items.

**Why it exists:** the most requested "quick win" automation in any
organisation — and a clean demonstration that an LLM step is just another
node: prompt in, JSON contract out, no magic.

**Flow:** `Webhook (text POST)` → `Claude (structured JSON prompt)` →
`Code (JS): validate/shape the contract` → `Respond to page`.

**Demonstrates:** LLM-in-the-loop automation, prompt design with JSON
contracts, input validation, API cost awareness (single call, capped tokens).
