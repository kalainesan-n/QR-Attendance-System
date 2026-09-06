const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { connectDb, isDbConnected } = require("./db");
const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events");
const attendanceRoutes = require("./routes/attendance");

const app = express();
const PORT = process.env.PORT || 5000;

// Parse configured CLIENT_URL (supports comma-separated URLs, trailing slashes, and Vercel domains)
const configuredOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

function isAllowedOrigin(origin) {
  // Allow requests with no origin (like mobile apps, curl, or server-to-server)
  if (!origin) return true;

  const normalized = origin.replace(/\/+$/, "");
  if (configuredOrigins.includes(normalized) || configuredOrigins.includes("*")) {
    return true;
  }

  // Automatically allow any Vercel deployment (*.vercel.app)
  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith(".vercel.app")) {
      return true;
    }
  } catch {
    // ignore URL parse errors
  }

  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    database: isDbConnected() ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/attendance", attendanceRoutes);

// ─── HTTP + Socket.io setup ──────────────────────────────────────────────────
// Wrap Express app with HTTP server so REST and WebSockets share the same port
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Socket.io CORS blocked for origin: ${origin}`));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Export io so attendance routes can emit events
module.exports.io = io;

io.on("connection", (socket) => {
  // Organizer joins room "event:<eventId>" to receive live updates
  socket.on("join:event", (eventId) => {
    socket.join(`event:${eventId}`);
  });

  socket.on("leave:event", (eventId) => {
    socket.leave(`event:${eventId}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDb();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
