import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import QRScanner from "../components/QRScanner";

export default function AttendeeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [checkInState, setCheckInState] = useState(null); // null | { status, message, eventName }
  const [checkingIn, setCheckingIn] = useState(false);

  // Load all upcoming events for the attendee
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/api/events");
        setEvents(res.data.events);
      } catch (err) {
        setFetchError(err.response?.data?.message || "Could not load events.");
      }
    }
    load();
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Called when the QR scanner successfully decodes a QR code.
  // decodedText = the event ID string stored in the QR code.
  async function handleQRScan(decodedText) {
    setShowScanner(false);
    setCheckInState(null);
    setCheckingIn(true);

    const eventId = decodedText.trim();

    // Ask the browser for the user's GPS location
    if (!navigator.geolocation) {
      setCheckInState({
        status: "error",
        message: "Your browser does not support geolocation. Cannot check in.",
        eventName: "",
      });
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await api.post("/api/attendance/checkin", {
            eventId,
            latitude,
            longitude,
          });
          // Find event name for display
          const ev = events.find((e) => e._id === eventId);
          setCheckInState({
            status: res.data.status,
            message: res.data.message,
            eventName: ev ? ev.name : "Event",
          });
        } catch (err) {
          const msg = err.response?.data?.message || "Check-in failed.";
          const existingStatus = err.response?.data?.status;
          setCheckInState({
            status: err.response?.status === 409 ? "duplicate" : "error",
            message: msg,
            eventName: "",
            existingStatus,
          });
        } finally {
          setCheckingIn(false);
        }
      },
      (geoErr) => {
        let msg = "Could not get your location.";
        if (geoErr.code === 1) msg = "Location permission denied. Please allow location access and try again.";
        if (geoErr.code === 2) msg = "Location unavailable. Please try again outdoors.";
        if (geoErr.code === 3) msg = "Location request timed out. Please try again.";
        setCheckInState({ status: "error", message: msg, eventName: "" });
        setCheckingIn(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // ────────────────────────────────────────────────────────────────────────
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

        {/* ─── Check-In Action ─────────────────────────────────────────── */}
        <div className="checkin-banner">
          <h2>Check In to an Event</h2>
          <p>Scan the event QR code displayed by the organizer to check in.</p>
          <button onClick={() => { setCheckInState(null); setShowScanner(true); }} disabled={checkingIn}>
            {checkingIn ? "Processing…" : "Scan QR Code"}
          </button>
        </div>

        {/* ─── Check-In Result ─────────────────────────────────────────── */}
        {checkInState && (
          <div className={`checkin-result checkin-${checkInState.status}`}>
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
                <h3>Check-In Failed</h3>
              </>
            )}
            <p>{checkInState.message}</p>
            <button className="btn-secondary" onClick={() => setCheckInState(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* ─── Event List ──────────────────────────────────────────────── */}
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
                    <p className="event-meta">{ev.venue} · {ev.date} · {ev.time}</p>
                    {ev.description && <p className="event-desc">{ev.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── QR Scanner Modal ────────────────────────────────────────── */}
        {showScanner && (
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setShowScanner(false)}
          />
        )}

      </main>
    </div>
  );
}
