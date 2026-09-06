const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ["present", "rejected"], required: true },
    distanceFromVenue: { type: Number, required: true }, // in meters
  },
  { timestamps: true }
);

// Database-level unique constraint: one record per user per event
// This means a user can only attempt check-in once per event.
attendanceSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
