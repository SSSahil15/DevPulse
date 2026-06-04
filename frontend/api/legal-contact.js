// Vercel Serverless Function: /api/legal-contact
// Proxies legal/support enquiries from the Terms of Service page to Discord.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const webhookUrl = process.env.DISCORD_LEGAL_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: 'Legal webhook URL is not configured on the server.' });
  }

  try {
    const embed = req.body;

    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text();
      return res.status(discordRes.status).json({ error: `Discord API error: ${text}` });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[legal-contact]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
