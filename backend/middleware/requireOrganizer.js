function requireOrganizer(req, res, next) {
  if (req.user.role !== "organizer") {
    return res.status(403).json({ message: "Organizer account required." });
  }
  next();
}

function requireAttendee(req, res, next) {
  if (req.user.role !== "attendee") {
    return res.status(403).json({ message: "Attendee account required." });
  }
  next();
}

module.exports = { requireOrganizer, requireAttendee };
