const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  BACKEND_URL: z.string().url().default("http://localhost:4000"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  TOKEN_ENCRYPTION_SECRET: z
    .string()
    .min(32, "TOKEN_ENCRYPTION_SECRET must be at least 32 characters long."),
  GITHUB_TOKEN_STORE_FILE_PATH: z
    .string()
    .min(1)
    .default("./.data/github-provider-tokens.json"),
  GITHUB_REPO_PAGE_LIMIT: z.coerce.number().int().positive().max(50).default(10),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required."),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required."),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters."),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:");
  console.error(parsedEnv.error.flatten().fieldErrors);
  throw new Error("Failed to start due to invalid environment variables.");
}

const env = parsedEnv.data;

module.exports = {
  backendUrl: env.BACKEND_URL,
  aiServiceUrl: env.AI_SERVICE_URL,
  frontendUrl: env.FRONTEND_URL,
  githubClientId: env.GITHUB_CLIENT_ID,
  githubClientSecret: env.GITHUB_CLIENT_SECRET,
  githubRepoPageLimit: env.GITHUB_REPO_PAGE_LIMIT,
  githubTokenStoreFilePath: env.GITHUB_TOKEN_STORE_FILE_PATH,
  isProduction: env.NODE_ENV === "production",
  jwtSecret: env.JWT_SECRET,
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  tokenEncryptionSecret: env.TOKEN_ENCRYPTION_SECRET,
  discordWebhookUrl: env.DISCORD_WEBHOOK_URL,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  }
};
