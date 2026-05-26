const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { pubClient, subClient } = require("./config/redis");
const jwt = require("jsonwebtoken");
const config = require("./config/env");
const logger = require("./utils/logger");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [config.frontendUrl, "http://localhost:5173", "http://localhost:5174", ...config.allowedOrigins],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`[Socket] User connected: ${socket.user.id}`);

    // Allow user to subscribe to specific rooms (e.g., repo_123)
    socket.on("subscribe", (room) => {
      socket.join(room);
      logger.info(`[Socket] User ${socket.user.id} joined room ${room}`);
    });

    socket.on("unsubscribe", (room) => {
      socket.leave(room);
      logger.info(`[Socket] User ${socket.user.id} left room ${room}`);
    });

    socket.on("disconnect", () => {
      logger.info(`[Socket] User disconnected: ${socket.user.id}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

module.exports = { initSocket, getIo };
