// Server-side reader of a PUBLIC Telegram channel's web preview (t.me/s/…):
// no API keys, no visitor login — we parse the last messages and hand the
// page a clean feed. This is how the console proves alerts really land in
// Telegram without giving anyone access to a private chat.
export default async function handler(req, res) {
  const channel = process.env.TG_CHANNEL || 'public_test_cocabadger'; // public name, not a secret
  if (!channel) return res.status(200).json([]);
  try {
    const html = await (await fetch(`https://t.me/s/${channel}`)).text();
    const out = [];
    const blocks = html.split('tgme_widget_message_wrap').slice(1);
    for (const b of blocks) {
      const textM = b.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
      const timeM = b.match(/<time datetime="([^"]+)"/);
      if (!textM) continue;
      const text = textM[1]
        .replace(/<br\s*\/?>(\n)?/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&#33;/g, '!').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .trim();
      out.push({ text, at: timeM ? timeM[1] : null });
    }
    res.setHeader('Cache-Control', 's-maxage=10');
    res.status(200).json(out.slice(-8).reverse());
  } catch {
    res.status(200).json([]);
  }
}
