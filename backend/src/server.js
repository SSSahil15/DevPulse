const app = require("./app");
const config = require("./config/env");
const { db } = require("./db/database");

const server = app.listen(config.port, () => {
  console.log(`DevPulse backend listening on http://localhost:${config.port}`);
});

function shutdown() {
  console.log("\n[Server] Received kill signal, shutting down gracefully...");
  
  server.close(() => {
    console.log("[Server] Closed out remaining HTTP connections.");
    try {
      db.close();
      console.log("[DB] SQLite connection closed successfully.");
    } catch (err) {
      console.error("[DB] Error closing SQLite database:", err);
    }
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error("[Server] Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

