import { useEffect, useRef, useState } from "react";
import api from "./api";

const getLocation = () => new Promise((resolve) => {
  if (!navigator.geolocation) {
    resolve(null);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => resolve({
      lat: position.coords.latitude,
      lng: position.coords.longitude
    }),
    () => resolve(null),
    { timeout: 8000, enableHighAccuracy: true }
  );
});

export default function SOSButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [locationStatus, setLocationStatus] = useState("Location not shared");
  const [currentLocation, setCurrentLocation] = useState(null);
  const [copied, setCopied] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation || typeof navigator.geolocation.watchPosition !== "function") {
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
      () => setLocationStatus("Location permission needed"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    return () => {
      if (
        watchIdRef.current !== null &&
        typeof navigator.geolocation.clearWatch === "function"
      ) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const sendSOS = async () => {
    setLoading(true);
    setResult(null);
    setCopied(false);
    let location = currentLocation;

    if (!location) {
      setLocationStatus("Finding your location...");
      location = await getLocation();
      if (location) {
        setCurrentLocation(location);
        setLocationStatus("Location ready");
      }
    }

    const timestamp = new Date().toISOString();
    const payload = location ? {
      latitude: location.lat,
      longitude: location.lng,
      timestamp
    } : null;

    if (!payload) {
      setResult({
        demo: true,
        title: "SOS demo alert ready",
        message: "No location was available. Use the emergency call button below if you need immediate help."
      });
      setLoading(false);
      return;
    }

    try {
      await api.post("/api/sos", payload);
      setResult({
        demo: false,
        title: "Emergency alert sent",
        message: `Your location was shared at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}.`
      });
    } catch (requestError) {
      console.warn("Response service unavailable; showing demo confirmation.", requestError);
      setResult({
        demo: true,
        title: "SOS demo alert ready",
        message: `Your alert is prepared with your location (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}). Use the actions below while the response service is offline.`
      });
    } finally {
      setLoading(false);
    }
  };

  const shareLocation = async () => {
    const locationText = currentLocation
      ? `I need help. My location: https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`
      : "I need help. Please call me.";

    if (navigator.share) {
      await navigator.share({ title: "SafeSHEE emergency location", text: locationText });
      return;
    }

    await navigator.clipboard?.writeText(locationText);
    setCopied(true);
  };

  return (
    <div className="sos-container">
      <div className="sos-preflight">
        <span className={`location-pulse ${currentLocation ? "ready" : ""}`} aria-hidden="true" />
        <div>
          <strong>{locationStatus}</strong>
          <span>{currentLocation ? "Ready to share with responders" : "We will ask for permission when needed"}</span>
        </div>
        {currentLocation && (
          <span className="coords">
            {currentLocation.lat.toFixed(2)}, {currentLocation.lng.toFixed(2)}
          </span>
        )}
      </div>

      <button
        type="button"
        className="sos-button"
        onClick={sendSOS}
        disabled={loading}
        aria-label="Send emergency SOS"
      >
        <span className="sos-button-ring" aria-hidden="true">
          {loading ? <span className="loading-spinner" /> : <span className="sos-icon">!</span>}
        </span>
        <span className="sos-button-copy">
          <strong>{loading ? "Preparing alert" : "Send SOS"}</strong>
          <small>{loading ? "Please stay with us..." : "One tap for emergency help"}</small>
        </span>
        {!loading && <span className="sos-arrow" aria-hidden="true">→</span>}
      </button>

      {result && (
        <section className={`sos-response ${result.demo ? "demo-response" : "sent-response"}`} role="status" aria-live="polite">
          <div className="response-header">
            <span className="response-icon" aria-hidden="true">{result.demo ? "!" : "✓"}</span>
            <div>
              <p className="response-kicker">{result.demo ? "Action needed" : "Response confirmed"}</p>
              <h3>{result.title}</h3>
            </div>
            <button type="button" className="response-close" onClick={() => setResult(null)} aria-label="Close SOS response">×</button>
          </div>
          <p className="response-message">{result.message}</p>
          <div className="response-steps">
            <div><span>01</span><p><strong>Stay visible</strong><small>Move toward people, light, or a trusted place.</small></p></div>
            <div><span>02</span><p><strong>Contact someone</strong><small>Call emergency services or share your location now.</small></p></div>
          </div>
          <div className="response-actions">
            <a className="emergency-call" href="tel:112"><span aria-hidden="true">☎</span> Call 112</a>
            <button type="button" className="share-action" onClick={shareLocation}>
              <span aria-hidden="true">⌁</span> {copied ? "Location copied" : "Share location"}
            </button>
            <button type="button" className="retry-action" onClick={sendSOS} disabled={loading}>Try again</button>
          </div>
          <p className="response-note">SafeSHEE does not replace emergency services. If you are in immediate danger, call your local emergency number.</p>
        </section>
      )}
    </div>
  );
}
