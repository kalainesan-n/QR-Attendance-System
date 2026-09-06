import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import api from "../api";
import LiveStats from "./LiveStats";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// AttendeeList fetches the attendance records for an event and shows them
// in a table. It also connects to Socket.io to receive live updates
// whenever a new check-in happens — no page refresh needed.
//
// Props:
//   event - the event object (must have _id and organizerId)
//   onClose - called when user clicks "Back to Events"

export default function AttendeeList({ event, onClose }) {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load initial data
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/api/attendance/${event._id}`);
        setRecords(res.data.attendance);
        setStats(res.data.stats);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load attendance.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [event._id]);

  // Socket.io: join the event room and listen for live updates
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      // Join the event-specific room so we only get updates for THIS event
      socket.emit("join:event", event._id);
    });

    socket.on("attendance:new", ({ attendance }) => {
      setRecords((prev) => {
        // Avoid duplicates (in case the same record arrives twice)
        const exists = prev.some((r) => r._id === attendance._id);
        if (exists) return prev;
        const updated = [...prev, attendance];
        // Recalculate stats
        const present = updated.filter((r) => r.status === "present").length;
        setStats({
          total: updated.length,
          present,
          percentage: Math.round((present / updated.length) * 100),
        });
        return updated;
      });
    });

    return () => {
      socket.emit("leave:event", event._id);
      socket.disconnect();
    };
  }, [event._id]);

  async function handleExportCSV() {
    try {
      const res = await api.get(`/api/attendance/${event._id}/csv`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${event.name.replace(/\s+/g, "_")}_attendance.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Could not export CSV. Please try again.");
    }
  }

  if (loading) return <div className="loading">Loading attendance…</div>;

  return (
    <div className="attendee-list">
      <div className="attendee-list-header">
        <div>
          <h3>Attendance: {event.name}</h3>
          <p className="venue-label">{event.venue}</p>
        </div>
        <div className="attendee-list-actions">
          <button onClick={handleExportCSV} className="btn-secondary">
            Export CSV
          </button>
          <button onClick={onClose} className="btn-secondary">
            ← Back
          </button>
        </div>
      </div>

      <LiveStats total={stats.total} present={stats.present} />

      {error && <div className="error-msg">{error}</div>}

      {records.length === 0 ? (
        <p className="empty-msg">No check-ins yet. Updates appear live.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Reg ID</th>
                <th>Status</th>
                <th>Distance</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r._id}>
                  <td>{i + 1}</td>
                  <td>{r.userId?.name || "—"}</td>
                  <td>{r.userId?.email || "—"}</td>
                  <td>{r.userId?.registrationId || "—"}</td>
                  <td>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </td>
                  <td>{r.distanceFromVenue}m</td>
                  <td>{r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
