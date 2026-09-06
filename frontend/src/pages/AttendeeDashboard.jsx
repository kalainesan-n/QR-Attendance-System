import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import QRScanner from "../components/QRScanner";

// Helper function to acquire GPS coordinates with fallback
function getCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Your browser does not support geolocation."));
    }

    // Try high accuracy first; if it times out (common on desktop/laptops), fallback to standard accuracy
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => {
        // Code 3 = TIMEOUT, Code 2 = POSITION_UNAVAILABLE
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (fallbackErr) => reject(fallbackErr),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        } else {
          reject(err);
        }
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );
  });
}

// Helper to extract a 24-char hexadecimal ObjectId from text or URLs
function extractEventId(text) {
  if (!text) return "";
  const clean = String(text).trim();
  const match = clean.match(/[a-f0-9]{24}/i);
  return match ? match[0] : clean;
}

export default function AttendeeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [checkInState, setCheckInState] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Load all upcoming events for the attendee
  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
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

  // Automatic Check-in execution given an event ID
  async function performCheckIn(rawId) {
    const eventId = extractEventId(rawId);
    if (!eventId) {
      setCheckInState({
        status: "error",
        message: "Invalid event QR code. Could not detect a valid Event ID.",
        eventName: "",
      });
      return;
    }

    setShowScanner(false);
    setCheckingIn(true);

    const matchedEvent = events.find((e) => e._id === eventId);
    const eventName = matchedEvent ? matchedEvent.name : "Event";

    setCheckInState({
      status: "processing",
      message: `Event detected: ${eventName}. Acquiring your GPS location to verify geofence...`,
      eventName,
    });

    try {
      // 1. Obtain coordinates
      const coords = await getCoordinates();

      setCheckInState({
        status: "processing",
        message: `Location acquired (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}). Submitting check-in...`,
        eventName,
      });

      // 2. Call backend check-in API
      const res = await api.post("/api/attendance/checkin", {
        eventId,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      // 3. Display result (present or rejected)
      setCheckInState({
        status: res.data.status,
        message: res.data.message,
        distanceFromVenue: res.data.distanceFromVenue,
        geofenceRadius: res.data.geofenceRadius,
        eventName,
      });
    } catch (err) {
      if (err.response?.status === 409) {
        setCheckInState({
          status: "duplicate",
          message: err.response.data?.message || "You have already checked in to this event.",
          eventName,
        });
      } else if (err.response?.data?.message) {
        setCheckInState({
          status: "error",
          message: err.response.data.message,
          eventName,
        });
      } else {
        let msg = err.message || "Check-in failed.";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location access in your browser settings and try again.";
        } else if (err.code === 2) {
          msg = "Location unavailable. Please check your GPS/internet connection.";
        } else if (err.code === 3) {
          msg = "Location request timed out. Please try again.";
        }
        setCheckInState({
          status: "error",
          message: msg,
          eventName,
        });
      }
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🎫 Attendee Dashboard</h1>
        <div className="header-right">
          <span>Hello, {user?.name}</span>
          <button onClick={handleLogout} className="btn-secondary btn-sm">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* ─── Check-In Action Banner ──────────────────────────────────── */}
        <div className="checkin-banner">
          <h2>Check In to an Event</h2>
          <p>Scan the organizer's event QR code to automatically verify your location and check in.</p>
          <button
            onClick={() => {
              setCheckInState(null);
              setShowScanner(true);
            }}
            disabled={checkingIn}
          >
            {checkingIn ? "Checking In…" : "Scan Event QR Code"}
          </button>
        </div>

        {/* ─── Check-In Result Banner ──────────────────────────────────── */}
        {checkInState && (
          <div className={`checkin-result checkin-${checkInState.status}`}>
            {checkInState.status === "processing" && (
              <>
                <div className="checkin-icon">⏳</div>
                <h3>Verifying Location…</h3>
              </>
            )}
            {checkInState.status === "present" && (
              <>
                <div className="checkin-icon">✅</div>
                <h3>Check-In Successful!</h3>
              </>
            )}
            {checkInState.status === "rejected" && (
              <>
                <div className="checkin-icon">❌</div>
                <h3>Outside Geofence</h3>
              </>
            )}
            {checkInState.status === "duplicate" && (
              <>
                <div className="checkin-icon">⚠️</div>
                <h3>Already Checked In</h3>
              </>
            )}
            {checkInState.status === "error" && (
              <>
                <div className="checkin-icon">⚠️</div>
                <h3>Check-In Notice</h3>
              </>
            )}

            {checkInState.eventName && (
              <p style={{ fontWeight: "600", marginBottom: "6px" }}>{checkInState.eventName}</p>
            )}
            <p>{checkInState.message}</p>

            {checkInState.status !== "processing" && (
              <button
                className="btn-secondary"
                style={{ marginTop: "12px" }}
                onClick={() => setCheckInState(null)}
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* ─── Upcoming Events List ────────────────────────────────────── */}
        <section>
          <h2>Upcoming Events</h2>

          {fetchError && <div className="error-msg">{fetchError}</div>}

          {events.length === 0 ? (
            <p className="empty-msg">No events available at the moment.</p>
          ) : (
            <div className="event-cards">
              {events.map((ev) => (
                <div key={ev._id} className="event-card">
                  <div className="event-card-body">
                    <h3>{ev.name}</h3>
                    <p className="event-meta">
                      📍 {ev.venue} · 📅 {ev.date} · ⏰ {ev.time}
                    </p>
                    {ev.description && <p className="event-desc">{ev.description}</p>}
                    <p className="event-meta" style={{ marginTop: "4px" }}>
                      Geofence Radius: {ev.geofenceRadius}m
                    </p>
                  </div>
                  <div className="event-card-actions">
                    <button
                      onClick={() => performCheckIn(ev._id)}
                      disabled={checkingIn}
                      className="btn-sm"
                    >
                      Check In Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── QR Scanner Modal ────────────────────────────────────────── */}
        {showScanner && (
          <QRScanner
            onScan={(decodedText) => performCheckIn(decodedText)}
            onClose={() => setShowScanner(false)}
          />
        )}
      </main>
    </div>
  );
}
