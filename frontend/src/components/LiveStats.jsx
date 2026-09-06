// Live stats bar shown on the organizer's attendee view.
// Props: total (attempts), present (successful check-ins)

export default function LiveStats({ total, present }) {
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="live-stats">
      <div className="stat-box">
        <span className="stat-number">{total}</span>
        <span className="stat-label">Total Attempts</span>
      </div>
      <div className="stat-box">
        <span className="stat-number present">{present}</span>
        <span className="stat-label">Present</span>
      </div>
      <div className="stat-box">
        <span className="stat-number">{percentage}%</span>
        <span className="stat-label">Attendance Rate</span>
      </div>
    </div>
  );
}
