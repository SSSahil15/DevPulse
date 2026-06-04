// Vercel Serverless Function: /api/discord-issue
// Proxies bug reports to the Discord webhook server-side to avoid CORS.

const FALLBACK_WEBHOOK_URL =
  'https://discord.com/api/webhooks/1508857983096852640/7UmsNebZaMK_l1aIOqX5dplCZ8KUhVk9UDXjaeK0SPiqxbeDhxe817Dr0IZ_lIOdLvyt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || FALLBACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: 'Discord webhook URL is not configured on the server.' });
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
    console.error('[discord-issue]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
