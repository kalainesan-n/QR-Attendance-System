import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import EventForm from "../components/EventForm";
import QRModal from "../components/QRModal";
import AttendeeList from "../components/AttendeeList";

// Views inside the organizer dashboard
const VIEW = {
  LIST: "list",
  CREATE: "create",
  EDIT: "edit",
  QR: "qr",
  ATTENDEES: "attendees",
};

export default function OrganizerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState(VIEW.LIST);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [actionError, setActionError] = useState("");

  // Load the organizer's events on mount
  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setFetchError("");
    try {
      const res = await api.get("/api/events");
      setEvents(res.data.events);
    } catch (err) {
      setFetchError(err.response?.data?.message || "Could not load events.");
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // ── Create event ────────────────────────────────────────────────────────
  async function handleCreate(data) {
    setActionError("");
    setLoading(true);
    try {
      await api.post("/api/events", data);
      setView(VIEW.LIST);
      loadEvents();
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not create event.");
    } finally {
      setLoading(false);
    }
  }

  // ── Edit event ──────────────────────────────────────────────────────────
  function openEdit(event) {
    setSelectedEvent(event);
    setActionError("");
    setView(VIEW.EDIT);
  }

  async function handleEdit(data) {
    setActionError("");
    setLoading(true);
    try {
      await api.put(`/api/events/${selectedEvent._id}`, data);
      setView(VIEW.LIST);
      loadEvents();
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not update event.");
    } finally {
      setLoading(false);
    }
  }

  // ── Delete event ────────────────────────────────────────────────────────
  async function handleDelete(event) {
    if (!window.confirm(`Delete "${event.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/events/${event._id}`);
      loadEvents();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete event.");
    }
  }

  // ── QR code ─────────────────────────────────────────────────────────────
  async function openQR(event) {
    setSelectedEvent(event);
    try {
      const res = await api.get(`/api/events/${event._id}/qr`);
      setQrData(res.data.dataUrl);
      setView(VIEW.QR);
    } catch (err) {
      alert(err.response?.data?.message || "Could not load QR code.");
    }
  }

  // ── Attendees ────────────────────────────────────────────────────────────
  function openAttendees(event) {
    setSelectedEvent(event);
    setView(VIEW.ATTENDEES);
  }

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>📋 Organizer Dashboard</h1>
        <div className="header-right">
          <span>Hello, {user?.name}</span>
          <button onClick={handleLogout} className="btn-secondary btn-sm">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">

        {/* ─── Event List ─────────────────────────────────────────────── */}
        {view === VIEW.LIST && (
          <section>
            <div className="section-header">
              <h2>My Events</h2>
              <button onClick={() => { setActionError(""); setView(VIEW.CREATE); }}>
                + New Event
              </button>
            </div>

            {fetchError && <div className="error-msg">{fetchError}</div>}

            {events.length === 0 ? (
              <p className="empty-msg">No events yet. Create one to get started.</p>
            ) : (
              <div className="event-cards">
                {events.map((ev) => (
                  <div key={ev._id} className="event-card">
                    <div className="event-card-body">
                      <h3>{ev.name}</h3>
                      <p className="event-meta">{ev.venue} · {ev.date} · {ev.time}</p>
                      {ev.description && <p className="event-desc">{ev.description}</p>}
                      <p className="event-meta">Geofence: {ev.geofenceRadius}m</p>
                    </div>
                    <div className="event-card-actions">
                      <button onClick={() => openQR(ev)} className="btn-sm">
                        View QR
                      </button>
                      <button onClick={() => openAttendees(ev)} className="btn-sm">
                        Attendees
                      </button>
                      <button onClick={() => openEdit(ev)} className="btn-sm btn-secondary">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(ev)} className="btn-sm btn-danger">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── Create Event ────────────────────────────────────────────── */}
        {view === VIEW.CREATE && (
          <section>
            <h2>Create New Event</h2>
            {actionError && <div className="error-msg">{actionError}</div>}
            <EventForm
              onSubmit={handleCreate}
              onCancel={() => setView(VIEW.LIST)}
              loading={loading}
            />
          </section>
        )}

        {/* ─── Edit Event ──────────────────────────────────────────────── */}
        {view === VIEW.EDIT && selectedEvent && (
          <section>
            <h2>Edit: {selectedEvent.name}</h2>
            {actionError && <div className="error-msg">{actionError}</div>}
            <EventForm
              initialData={{
                name: selectedEvent.name,
                venue: selectedEvent.venue,
                description: selectedEvent.description || "",
                latitude: selectedEvent.latitude,
                longitude: selectedEvent.longitude,
                date: selectedEvent.date,
                time: selectedEvent.time,
                geofenceRadius: selectedEvent.geofenceRadius,
              }}
              onSubmit={handleEdit}
              onCancel={() => setView(VIEW.LIST)}
              loading={loading}
            />
          </section>
        )}

        {/* ─── QR Modal ────────────────────────────────────────────────── */}
        {view === VIEW.QR && selectedEvent && (
          <QRModal
            eventName={selectedEvent.name}
            dataUrl={qrData}
            onClose={() => setView(VIEW.LIST)}
          />
        )}

        {/* ─── Attendee List ───────────────────────────────────────────── */}
        {view === VIEW.ATTENDEES && selectedEvent && (
          <AttendeeList
            event={selectedEvent}
            onClose={() => setView(VIEW.LIST)}
          />
        )}

      </main>
    </div>
  );
}
