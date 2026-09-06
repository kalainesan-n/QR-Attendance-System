// Simple modal that shows the QR code image for an event.
// The QR code is a base64 data URL returned from the backend.

export default function QRModal({ eventName, dataUrl, onClose }) {
  if (!dataUrl) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>QR Code — {eventName}</h3>
        <p className="modal-hint">Attendees scan this with the QR scanner to check in.</p>
        <img src={dataUrl} alt={`QR code for ${eventName}`} className="qr-image" />
        <div className="modal-actions">
          <a href={dataUrl} download={`${eventName.replace(/\s+/g, "_")}_qr.png`} className="btn-secondary">
            Download PNG
          </a>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
