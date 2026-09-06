const express = require("express");
const mongoose = require("mongoose");
const Event = require("../models/Event");
const { auth } = require("../middleware/auth");
const { requireOrganizer } = require("../middleware/requireOrganizer");
const { eventIdToDataUrl } = require("../utils/qr");

const router = express.Router();

function isOwner(event, userId) {
  return event.organizerId.toString() === userId;
}

function parseEventBody(body) {
  const { name, venue, description, latitude, longitude, date, time, geofenceRadius } = body;

  if (!name || !venue || latitude === undefined || longitude === undefined || !date || !time || geofenceRadius === undefined) {
    return { error: "Name, venue, latitude, longitude, date, time, and geofenceRadius are required." };
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const radius = Number(geofenceRadius);

  if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radius) || radius < 1) {
    return { error: "Latitude, longitude, and geofenceRadius must be valid numbers (radius at least 1 meter)." };
  }

  return {
    data: {
      name: String(name).trim(),
      venue: String(venue).trim(),
      description: description ? String(description).trim() : "",
      latitude: lat,
      longitude: lng,
      date: String(date).trim(),
      time: String(time).trim(),
      geofenceRadius: radius,
    },
  };
}

router.get("/", auth, async (req, res) => {
  try {
    const filter = req.user.role === "organizer" ? { organizerId: req.user.id } : {};
    const events = await Event.find(filter).sort({ date: 1, time: 1 });
    res.json({ events });
  } catch (err) {
    console.error("List events error:", err.message);
    res.status(500).json({ message: "Could not load events." });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (req.user.role === "organizer" && !isOwner(event, req.user.id)) {
      return res.status(403).json({ message: "You can only view your own events as an organizer." });
    }

    res.json({ event });
  } catch (err) {
    console.error("Get event error:", err.message);
    res.status(500).json({ message: "Could not load event." });
  }
});

router.get("/:id/qr", auth, requireOrganizer, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (!isOwner(event, req.user.id)) {
      return res.status(403).json({ message: "You can only view QR codes for your own events." });
    }

    const dataUrl = await eventIdToDataUrl(event._id);
    res.json({ eventId: event._id, dataUrl });
  } catch (err) {
    console.error("QR error:", err.message);
    res.status(500).json({ message: "Could not generate QR code." });
  }
});

router.post("/", auth, requireOrganizer, async (req, res) => {
  try {
    const parsed = parseEventBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const event = await Event.create({
      ...parsed.data,
      organizerId: req.user.id,
    });

    const qrDataUrl = await eventIdToDataUrl(event._id);
    res.status(201).json({ event, qrDataUrl });
  } catch (err) {
    console.error("Create event error:", err.message);
    res.status(500).json({ message: "Could not create event." });
  }
});

router.put("/:id", auth, requireOrganizer, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (!isOwner(event, req.user.id)) {
      return res.status(403).json({ message: "You can only edit your own events." });
    }

    const parsed = parseEventBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    Object.assign(event, parsed.data);
    await event.save();
    res.json({ event });
  } catch (err) {
    console.error("Update event error:", err.message);
    res.status(500).json({ message: "Could not update event." });
  }
});

router.delete("/:id", auth, requireOrganizer, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid event id." });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (!isOwner(event, req.user.id)) {
      return res.status(403).json({ message: "You can only delete your own events." });
    }

    await event.deleteOne();
    res.json({ message: "Event deleted." });
  } catch (err) {
    console.error("Delete event error:", err.message);
    res.status(500).json({ message: "Could not delete event." });
  }
});

module.exports = router;
