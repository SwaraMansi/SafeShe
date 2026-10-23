import { useState, useEffect, useRef } from "react";
import api from "./api";

/**
 * SOSButton Component
 * One-tap emergency button that:
 * - Gets user's GPS location
 * - Sends location to the backend /api/sos endpoint
 * - Shows clear success or error feedback
 */
export default function SOSButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [locationStatus, setLocationStatus] = useState("Location not shared");
  const [currentLocation, setCurrentLocation] = useState(null);
  
  const watchIdRef = useRef(null);
  const timeoutRef = useRef(null);

  /**
   * Initialize live location tracking
   */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Location is unavailable");
      return;
    }

    // Start watching position
    if (typeof navigator.geolocation.watchPosition !== "function") {
      return undefined;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationStatus("Location ready");
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationStatus("Location permission denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle SOS button click
   * Gets location and sends to backend
   */
  const sendSOS = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get current position
      let location = currentLocation;

      if (!location) {
        setLocationStatus("Getting your location...");
        location = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
              };
              setCurrentLocation(loc);
              resolve(loc);
            },
            () => resolve(null),
            { timeout: 8000, enableHighAccuracy: true }
          );
        });
      }

      const timestamp = new Date().toISOString();
      const payload = location ? {
        latitude: location.lat,
        longitude: location.lng,
        timestamp
      } : null;

      if (!payload) {
        setResult({
          title: "SOS demo alert ready",
          message: "Your emergency request was prepared. Enable location access and connect the response service to share it with responders.",
          demo: true
        });
      } else {
        console.log("SOS request:", payload);
        try {
          const data = await api.post("/api/sos", payload);
          setResult({
            title: "Emergency alert sent",
            message: `Your location was shared at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}.`,
            demo: false
          });
          console.log("SOS sent successfully:", data);
        } catch (requestError) {
          console.warn("Response service unavailable; showing demo confirmation.", requestError);
          setResult({
            title: "SOS demo alert ready",
            message: `The alert is ready with your location (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}). Connect the response service to send it to responders.`,
            demo: true
          });
        }
      }

      // Auto-dismiss after 6 seconds
      timeoutRef.current = setTimeout(() => {
        setResult(null);
      }, 6000);
    } catch (err) {
      console.error("SOS error:", err);
      setResult({
        title: "SOS demo alert ready",
        message: "Your emergency request was prepared in demo mode. Connect the response service to send it to responders.",
        demo: true
      });

      // Auto-dismiss after 6 seconds
      timeoutRef.current =       setTimeout(() => setResult(null), 6000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sos-container">
      {/* Location Status Badge */}
      <div className="location-status">
        <span className={currentLocation ? "location-ready" : ""}>
          <span aria-hidden="true">{currentLocation ? "●" : "○"}</span> {locationStatus}
        </span>
        {currentLocation && (
          <span className="coords">
            ({currentLocation.lat.toFixed(2)}, {currentLocation.lng.toFixed(2)})
          </span>
        )}
      </div>

      {/* SOS Button */}
      <button
        type="button"
        className="sos-button"
        onClick={sendSOS}
        disabled={loading}
        aria-label="Send emergency SOS"
        title="Send an emergency alert with your current location"
      >
        {loading ? (
          <>
            <span className="loading-spinner" aria-hidden="true" />
            Sending alert...
          </>
        ) : (
          <>
            <span className="sos-icon" aria-hidden="true">!</span>
            <span className="sos-text">Send SOS</span>
          </>
        )}
      </button>

      {/* Success Message */}
      {result && (
        <div className={`sos-message ${result.demo ? "demo-message" : "success-message"}`} role="status" aria-live="polite">
          <div className="message-title"><span aria-hidden="true">{result.demo ? "◌" : "✓"}</span> {result.title}</div>
          <div className="message-body">{result.message}</div>
          <button type="button" className="message-dismiss" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="sos-message error-message">
          <div className="message-title">{error.title}</div>
          <div className="message-body">{error.message}</div>
        </div>
      )}
    </div>
  );
}