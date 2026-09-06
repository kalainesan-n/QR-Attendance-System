import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

// QRScanner uses the html5-qrcode library to open the device camera and
// scan QR codes. When a valid QR is detected, it immediately invokes
// onScan(decodedText) and handles camera teardown cleanly.

export default function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState("");
  const [manualId, setManualId] = useState("");
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);
  const containerId = "qr-scanner-container";

  useEffect(() => {
    scannedRef.current = false;
    let html5QrCode = null;

    try {
      html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: "environment" }, // prefer rear/environment camera
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Guard against multiple frames triggering before unmount
            if (scannedRef.current) return;
            scannedRef.current = true;

            // Immediately invoke callback with the decoded text so check-in proceeds
            onScan(decodedText);

            // Gracefully stop camera in background
            try {
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(() => {});
              }
            } catch {
              // ignore stop errors
            }
          },
          () => {
            // Frame failed to detect QR — ignore normal scan frame misses
          }
        )
        .catch((err) => {
          setError(
            "Camera access error: " +
              (err?.message || "Please ensure camera permissions are granted in your browser.")
          );
        });
    } catch (e) {
      setError("Failed to initialize scanner: " + e.message);
    }

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch {
          // ignore cleanup errors during unmount
        }
      }
    };
  }, [onScan]);

  function handleManualSubmit(e) {
    e.preventDefault();
    if (!manualId.trim()) return;
    onScan(manualId.trim());
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Scan Event QR Code</h3>
        <p className="modal-hint">Point your camera at the organizer's QR code to check in.</p>

        {error ? (
          <div className="error-msg">{error}</div>
        ) : (
          <div id={containerId} style={{ width: "100%", minHeight: "260px" }} />
        )}

        {/* Fallback input for direct event ID entry */}
        <form
          onSubmit={handleManualSubmit}
          style={{
            marginTop: "16px",
            borderTop: "1px solid var(--border)",
            paddingTop: "12px",
          }}
        >
          <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
            Or enter Event ID manually:
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Paste event ID (e.g. 6a9d4372e556e911551bced6)"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              style={{ fontSize: "13px" }}
            />
            <button type="submit" className="btn-sm">
              Check In
            </button>
          </div>
        </form>

        <div className="modal-actions" style={{ marginTop: "16px" }}>
          <button onClick={onClose} className="btn-secondary">
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
