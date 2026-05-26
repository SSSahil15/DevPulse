import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketOptions {
  room?: string;
  onProgress?: (data: any) => void;
  onComplete?: (data: any) => void;
  onError?: (data: any) => void;
}

export function useSocket(options: SocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("devpulse_token");
    if (!token) {
      console.warn("No devpulse_token found, socket not connecting.");
      return;
    }

    // Use Vite env var or fallback to localhost:4000
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

    const socket = io(backendUrl, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      if (options.room) {
        socket.emit("subscribe", options.room);
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    if (options.onProgress) socket.on("scan:progress", options.onProgress);
    if (options.onComplete) socket.on("scan:complete", options.onComplete);
    if (options.onError) socket.on("scan:error", options.onError);

    return () => {
      if (options.room) {
        socket.emit("unsubscribe", options.room);
      }
      socket.disconnect();
    };
  }, [options.room]);

  return { isConnected, socket: socketRef.current };
}
