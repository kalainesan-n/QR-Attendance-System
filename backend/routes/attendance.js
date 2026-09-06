const express = require("express");
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Event = require("../models/Event");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const { requireOrganizer } = require("../middleware/requireOrganizer");
const { haversine } = require("../utils/haversine");

const router = express.Router();

// ─── Helper: get the Socket.io instance ─────────────────────────────────────
// We import it lazily so there's no circular dependency issue with server.js
function getIo() {
  return require("../server").io;
}

// ─── POST /api/attendance/checkin ────────────────────────────────────────────
// Any logged-in user (attendee OR organizer) can attempt a check-in.
// Body: { eventId, latitude, longitude }
router.post("/checkin", auth, async (req, res) => {
  try {
    const { eventId, latitude, longitude } = req.body;

    // 1. Validate inputs
    if (!eventId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "eventId, latitude, and longitude are required." });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({ message: "Latitude and longitude must be numbers." });
    }

    // 2. Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // 3. Calculate distance using Haversine formula
    const distance = haversine(lat, lon, event.latitude, event.longitude);
    const distance_m = Math.round(distance); // rounded to nearest meter

    // 4. Determine status based on geofence
    const status = distance <= event.geofenceRadius ? "present" : "rejected";

    // 5. Save attendance record (unique index prevents duplicates)
    let attendance;
    try {
      attendance = await Attendance.create({
        userId: req.user.id,
        eventId: event._id,
        status,
        distanceFromVenue: distance_m,
      });
    } catch (dbErr) {
      // MongoDB duplicate key error code 11000
      if (dbErr.code === 11000) {
        // Fetch the existing record so we can return meaningful info
        const existing = await Attendance.findOne({
          userId: req.user.id,
          eventId: event._id,
        });
        return res.status(409).json({
          message: "You have already checked in to this event.",
          status: existing ? existing.status : "unknown",
        });
      }
      throw dbErr;
    }

    // 6. Emit Socket.io event so organizer dashboard updates live
    try {
      const io = getIo();
      if (io) {
        // Get the user's name for the live update payload
        const user = await User.findById(req.user.id).select("name email registrationId");
        io.to(`event:${event._id}`).emit("attendance:new", {
          attendance: {
            _id: attendance._id,
            userId: {
              _id: req.user.id,
              name: user ? user.name : "Unknown",
              email: user ? user.email : "",
              registrationId: user ? (user.registrationId || "") : "",
            },
            eventId: event._id,
            timestamp: attendance.timestamp,
            status: attendance.status,
            distanceFromVenue: attendance.distanceFromVenue,
          },
        });
      }
    } catch (socketErr) {
      // Socket errors should never break the check-in response
      console.error("Socket emit error:", socketErr.message);
    }

    // 7. Return result
    return res.status(201).json({
      status,
      distanceFromVenue: distance_m,
      geofenceRadius: event.geofenceRadius,
      message:
        status === "present"
          ? `Check-in successful! You are ${distance_m}m from the venue.`
          : `Check-in rejected. You are ${distance_m}m away but the geofence is only ${event.geofenceRadius}m.`,
    });
  } catch (err) {
    console.error("Check-in error:", err.message);
    res.status(500).json({ message: "Could not process check-in." });
  }
});

// ─── GET /api/attendance/:eventId ────────────────────────────────────────────
// Organizer only, must own the event.
// Returns full attendee list with user info.
router.get("/:eventId", auth, requireOrganizer, async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only view attendance for your own events." });
    }

    const records = await Attendance.find({ eventId })
      .populate("userId", "name email registrationId")
      .sort({ timestamp: 1 });

    // Calculate live stats
    const total = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({
      attendance: records,
      stats: { total, present, percentage },
    });
  } catch (err) {
    console.error("Get attendance error:", err.message);
    res.status(500).json({ message: "Could not load attendance." });
  }
});

// ─── GET /api/attendance/:eventId/csv ────────────────────────────────────────
// Organizer only, must own the event.
// Returns a CSV string — no extra library needed.
router.get("/:eventId/csv", auth, requireOrganizer, async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only export attendance for your own events." });
    }

    const records = await Attendance.find({ eventId })
      .populate("userId", "name email registrationId")
      .sort({ timestamp: 1 });

    // Build CSV manually — columns: Name, Email, RegistrationID, Status, Timestamp
    const escape = (val) => {
      const s = String(val ?? "");
      // Wrap in quotes if it contains comma, quote, or newline
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const header = ["Name", "Email", "RegistrationID", "Attendance Status", "Timestamp"].join(",");
    const rows = records.map((r) => {
      const u = r.userId;
      return [
        escape(u ? u.name : ""),
        escape(u ? u.email : ""),
        escape(u ? (u.registrationId || "") : ""),
        escape(r.status),
        escape(r.timestamp ? r.timestamp.toISOString() : ""),
      ].join(",");
    });

    const csv = [header, ...rows].join("\r\n");

    // Safe filename from event name
    const safeName = event.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_attendance.csv"`);
    res.send(csv);
  } catch (err) {
    console.error("CSV export error:", err.message);
    res.status(500).json({ message: "Could not export attendance." });
  }
});

module.exports = router;
