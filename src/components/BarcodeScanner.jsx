import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import "./BarcodeScanner.css";

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (cancelled) return;
        if (result) {
          onDetected(result.getText());
        } else if (err && !(err instanceof NotFoundException)) {
          // NotFoundException fires continuously while no code is in frame — ignore it.
          console.warn("Scanner error:", err);
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch((err) => {
        setError(
          "Couldn't access the camera. Check that camera permission is granted, and that you're on HTTPS or localhost."
        );
        console.error(err);
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="scanner-overlay" role="dialog" aria-label="Scan a barcode">
      <div className="scanner-panel">
        <div className="scanner-header">
          <h3>Scan barcode</h3>
          <button className="scanner-close" onClick={onClose} aria-label="Close scanner">
            ✕
          </button>
        </div>
        {error ? (
          <p className="scanner-error">{error}</p>
        ) : (
          <>
            <div className="scanner-video-wrap">
              <video ref={videoRef} className="scanner-video" muted playsInline />
              <div className="scanner-reticle" />
            </div>
            <p className="scanner-hint">Center the barcode in the frame</p>
          </>
        )}
      </div>
    </div>
  );
}
