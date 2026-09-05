const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    geofenceRadius: { type: Number, required: true, min: 1 },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
