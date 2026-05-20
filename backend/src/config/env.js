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
  DATABASE_PATH: z.string().min(1).default("./.data/devpulse.db"),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
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
  // Performance thresholds
  SLOW_QUERY_THRESHOLD_MS:   z.coerce.number().int().positive().default(100),
  SLOW_REQUEST_THRESHOLD_MS: z.coerce.number().int().positive().default(1000),
  GROQ_API_KEY: z.string().optional(),
  INTERNAL_SERVICE_SECRET: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("[Config] ❌ Invalid environment configuration:");
  const errors = parsedEnv.error.flatten().fieldErrors;
  Object.entries(errors).forEach(([key, msgs]) => {
    console.error(`  - ${key}: ${msgs.join(", ")}`);
  });
  console.error("\n[Config] Required variables:");
  console.error("  - GITHUB_CLIENT_ID");
  console.error("  - GITHUB_CLIENT_SECRET");
  console.error("  - TOKEN_ENCRYPTION_SECRET (min 32 chars)");
  console.error("  - JWT_SECRET (min 32 chars)");
  console.error("  - BACKEND_URL");
  console.error("  - FRONTEND_URL");
  console.error("  - AI_SERVICE_URL");
  throw new Error("Failed to start due to invalid environment variables.");
}

const env = parsedEnv.data;

console.log("[Config] ✓ Environment loaded successfully");
console.log("[Config]   NODE_ENV:", env.NODE_ENV);
console.log("[Config]   PORT:", env.PORT);
console.log("[Config]   DATABASE_PATH:", env.DATABASE_PATH);
console.log("[Config]   DATABASE_URL:", env.DATABASE_URL || "not set");
console.log("[Config]   REDIS_URL:", env.REDIS_URL || "not set");
console.log("[Config]   BACKEND_URL:", env.BACKEND_URL);
console.log("[Config]   FRONTEND_URL:", env.FRONTEND_URL);
console.log("[Config]   AI_SERVICE_URL:", env.AI_SERVICE_URL);

module.exports = {
  backendUrl: env.BACKEND_URL,
  aiServiceUrl: env.AI_SERVICE_URL,
  frontendUrl: env.FRONTEND_URL,
  githubClientId: env.GITHUB_CLIENT_ID,
  githubClientSecret: env.GITHUB_CLIENT_SECRET,
  databasePath: env.DATABASE_PATH,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  githubRepoPageLimit: env.GITHUB_REPO_PAGE_LIMIT,
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
  },
  // Performance monitoring thresholds
  slowQueryThresholdMs:   env.SLOW_QUERY_THRESHOLD_MS,
  slowRequestThresholdMs: env.SLOW_REQUEST_THRESHOLD_MS,
  groqApiKey: env.GROQ_API_KEY,
  internalServiceSecret: env.INTERNAL_SERVICE_SECRET,
};
