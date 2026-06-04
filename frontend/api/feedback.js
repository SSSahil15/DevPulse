// Vercel Serverless Function: /api/feedback
// Receives "Send us a message" form submissions and forwards to Discord or logs them.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "text" field.' });
    }

    // Log always so we have a record in Vercel function logs
    console.log('[feedback]', text);

    // If a Discord webhook is configured, forward it there
    if (webhookUrl) {
      const embed = {
        title: '📬 Contact Form Submission',
        description: text,
        color: 0x6366f1,
        footer: { text: 'DevPulse · Contact Page' },
        timestamp: new Date().toISOString(),
      };

      const discordRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (!discordRes.ok) {
        const errText = await discordRes.text();
        console.error('[feedback] Discord error:', errText);
        // Still return 200 to the user — message was logged
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[feedback]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
