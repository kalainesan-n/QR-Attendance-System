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
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);
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
// We create a plain HTTP server and wrap it with Socket.io so both REST and
// WebSocket connections share the same port.
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Export io so attendance routes can emit events
module.exports.io = io;

io.on("connection", (socket) => {
  // Organizer joins a room named "event:<eventId>" to receive live updates
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
