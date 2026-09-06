import { useState } from "react";

// Reusable form for creating and editing events.
// Props:
//   initialData  - pre-filled values when editing
//   onSubmit(data) - called with the form data object
//   onCancel()   - called when user clicks Cancel
//   loading      - disables buttons while saving

const DEFAULTS = {
  name: "",
  venue: "",
  description: "",
  latitude: "",
  longitude: "",
  date: "",
  time: "",
  geofenceRadius: "100",
};

export default function EventForm({ initialData = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...initialData });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const lat = Number(form.latitude);
    const lon = Number(form.longitude);
    const radius = Number(form.geofenceRadius);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      return setError("Latitude must be a number between -90 and 90.");
    }
    if (Number.isNaN(lon) || lon < -180 || lon > 180) {
      return setError("Longitude must be a number between -180 and 180.");
    }
    if (Number.isNaN(radius) || radius < 1) {
      return setError("Geofence radius must be at least 1 metre.");
    }

    onSubmit({
      name: form.name.trim(),
      venue: form.venue.trim(),
      description: form.description.trim(),
      latitude: lat,
      longitude: lon,
      date: form.date,
      time: form.time,
      geofenceRadius: radius,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="event-form">
      {error && <div className="error-msg">{error}</div>}

      <label>Event Name *</label>
      <input name="name" value={form.name} onChange={handleChange} required />

      <label>Venue *</label>
      <input name="venue" value={form.venue} onChange={handleChange} required />

      <label>Description</label>
      <textarea name="description" value={form.description} onChange={handleChange} rows={3} />

      <div className="form-row">
        <div>
          <label>Latitude * <small>(e.g. 13.0827)</small></label>
          <input
            name="latitude"
            type="number"
            step="any"
            value={form.latitude}
            onChange={handleChange}
            required
            placeholder="13.0827"
          />
        </div>
        <div>
          <label>Longitude * <small>(e.g. 80.2707)</small></label>
          <input
            name="longitude"
            type="number"
            step="any"
            value={form.longitude}
            onChange={handleChange}
            required
            placeholder="80.2707"
          />
        </div>
      </div>

      <div className="form-row">
        <div>
          <label>Date *</label>
          <input name="date" type="date" value={form.date} onChange={handleChange} required />
        </div>
        <div>
          <label>Time *</label>
          <input name="time" type="time" value={form.time} onChange={handleChange} required />
        </div>
      </div>

      <label>Geofence Radius (metres) *</label>
      <input
        name="geofenceRadius"
        type="number"
        min="1"
        value={form.geofenceRadius}
        onChange={handleChange}
        required
      />
      <small>Only attendees within this many metres of the venue can check in.</small>

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save Event"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
