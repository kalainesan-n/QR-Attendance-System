import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

// QRScanner uses the html5-qrcode library to open the device camera and
// scan QR codes. When a valid QR is detected, it calls onScan(decodedText).
// 
// The QR code for each event contains just the event ID (a MongoDB ObjectId string).

export default function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState("");
  const scannerRef = useRef(null);
  const containerId = "qr-scanner-container";

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" }, // prefer rear camera
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Stop scanner once a QR is detected
          html5QrCode.stop().then(() => {
            onScan(decodedText);
          });
        },
        () => {
          // Called on every failed frame — we ignore these
        }
      )
      .catch((err) => {
        setError("Camera access denied or unavailable. " + (err?.message || ""));
      });

    // Cleanup on unmount
    return () => {
      html5QrCode.stop().catch(() => {});
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Scan QR Code</h3>
        <p>Point your camera at the event QR code.</p>

        {error ? (
          <div className="error-msg">{error}</div>
        ) : (
          <div id={containerId} style={{ width: "100%", minHeight: "280px" }} />
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}
