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

      if (!location) {
        throw new Error("Unable to get location");
      }

      // Prepare payload
      const payload = {
        latitude: location.lat,
        longitude: location.lng,
        timestamp: new Date().toISOString()
      };

      console.log("🚨 Sending SOS:", payload);

      // Send to backend
      const data = await api.post("/api/sos", payload);
      
      setResult({
        title: "Emergency alert sent",
        message: `Location shared at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
      });

      console.log("SOS sent successfully:", data);

      // Auto-dismiss after 6 seconds
      timeoutRef.current = setTimeout(() => {
        setResult(null);
      }, 6000);
    } catch (err) {
      console.error("SOS error:", err);
      setError({
        title: "Failed to Send SOS",
        message: err.message || "Please try again"
      });

      // Auto-dismiss after 6 seconds
      timeoutRef.current = setTimeout(() => {
        setError(null);
      }, 6000);
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
        <div className="sos-message success-message">
          <div className="message-title">{result.title}</div>
          <div className="message-body">{result.message}</div>
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