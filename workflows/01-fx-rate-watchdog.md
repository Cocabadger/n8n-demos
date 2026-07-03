# 1 · FX Rate Watchdog

**What it does:** every morning (and on demand via the Run button) it pulls the
official USD/UAH rate from the National Bank of Ukraine API and the live
USDT/UAH price from the Binance P2P order book, computes the P2P premium in a
JavaScript Code node, and sends a Telegram alert when the premium goes
anomalous (>3%). The Run button returns the live numbers straight to this page.

**Why it exists:** stablecoin cash-outs never happen at the official rate.
The premium between the two is real money — this watchdog is how a finance
team notices it moving without checking exchanges by hand. The same pattern
(pull metric → compute → alert on threshold) covers most internal monitoring
asks.

**Flow:** `Schedule (daily 09:00)` + `Webhook (Run button)` → `HTTP: NBU API`
→ `HTTP: Binance P2P (POST)` → `Code (JS): median price + premium %` →
`IF premium > 3%` → `Telegram alert` · webhook branch responds with JSON.

**Demonstrates:** external REST APIs (GET + POST with JSON body), cron
scheduling, JavaScript logic in a low-code environment, conditional routing,
alerting integrations, dual-trigger workflows.
