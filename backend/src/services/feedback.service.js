const axios = require("axios");
const nodemailer = require("nodemailer");
const config = require("../config/env");

const fs = require("fs");
const path = require("path");

// 1. File-based Database
const FEEDBACK_FILE = path.join(__dirname, "../..", ".data", "feedback.json");

// Ensure .data directory exists
const dataDir = path.dirname(FEEDBACK_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load feedback from file or initialize empty array
let feedbackDatabase = [];
if (fs.existsSync(FEEDBACK_FILE)) {
  try {
    feedbackDatabase = JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf-8"));
  } catch (err) {
    console.error("[Feedback DB] Failed to parse feedback file, starting fresh.");
    feedbackDatabase = [];
  }
}

function saveFeedbackDatabase() {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbackDatabase, null, 2), "utf-8");
}

// Create transporter only if SMTP config is partially present
const transporter = config.smtp.host && config.smtp.user ? nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
}) : null;

async function processFeedback(text, email = "anonymous") {
  const feedbackEntry = {
    id: Date.now().toString(),
    text,
    email,
    createdAt: new Date().toISOString()
  };

  // 1. Save to Database
  feedbackDatabase.push(feedbackEntry);
  saveFeedbackDatabase();
  console.log(`[Feedback DB] Saved new feedback from ${email}: ${text}`);

  const promises = [];

  // 2. Send to Discord
  if (config.discordWebhookUrl) {
    const discordPayload = {
      embeds: [{
        title: "New DevPulse Feedback \uD83D\uDCE2",
        description: text,
        color: 3447003, // Blue
        fields: [
          { name: "From", value: email, inline: true },
          { name: "Time", value: new Date().toLocaleString(), inline: true }
        ]
      }]
    };

    const discordPromise = axios.post(config.discordWebhookUrl, discordPayload)
      .then(() => console.log("[Discord] Webhook sent successfully."))
      .catch(err => console.error("[Discord] Failed to send webhook:", err.message));
    
    promises.push(discordPromise);
  } else {
    console.log("[Discord] Skipped (DISCORD_WEBHOOK_URL not configured)");
  }

  // 3. Send to Email
  if (transporter && config.smtp.user) {
    const mailOptions = {
      from: config.smtp.user,
      to: "ansarisahil3690@gmail.com",
      subject: "New DevPulse Feedback Received",
      text: `You have received new feedback on DevPulse:\n\nFrom: ${email}\nTime: ${new Date().toLocaleString()}\n\nFeedback:\n${text}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2563eb;">New DevPulse Feedback \uD83D\uDCE2</h2>
          <p><strong>From:</strong> ${email}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 16px; line-height: 1.5; color: #333;">${text}</p>
        </div>
      `
    };

    const emailPromise = transporter.sendMail(mailOptions)
      .then(() => console.log("[Email] Notification sent successfully."))
      .catch(err => console.error("[Email] Failed to send email:", err.message));

    promises.push(emailPromise);
  } else {
    console.log("[Email] Skipped (SMTP credentials not fully configured)");
  }

  // Wait for external services to complete (or fail gracefully)
  await Promise.allSettled(promises);

  return feedbackEntry;
}

function getFeedbackHistory() {
  return feedbackDatabase;
}

module.exports = {
  processFeedback,
  getFeedbackHistory
};
