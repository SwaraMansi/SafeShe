import React, { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function UserDashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [primaryContact, setPrimaryContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Red Zone Features
  const [redZones, setRedZones] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [redZoneAlert, setRedZoneAlert] = useState(false);
  const [redZoneAlertCooldown, setRedZoneAlertCooldown] = useState(false);
  const watchPositionRef = useRef(null);
  const lastRedZoneAlertTimeRef = useRef(0);

  // SOS Photo & Offline Features
  const [cameraActive, setCameraActive] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Safety & Walk Modes
  const [safetyModeActive, setSafetyModeActive] = useState(false);
  const [safeWalkActive, setSafeWalkActive] = useState(false);
  const [locationHistory, setLocationHistory] = useState([]);
  const safetyTimerRef = useRef(null);
  const lastLocationRef = useRef(null);

  // Voice & Gesture Detection
  const [voiceDetectionActive, setVoiceDetectionActive] = useState(false);
  const [gestureDetectionActive, setGestureDetectionActive] = useState(false);
  const [distressKeywords] = useState([
    "help",
    "emergency",
    "danger",
    "attack",
    "rape",
    "kidnap",
  ]);
  const recognitionRef = useRef(null);

  // Voice Distress Emergency Workflow
  const [voiceDistressCooldown, setVoiceDistressCooldown] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [autoCallEnabled, setAutoCallEnabled] = useState(false);
  const voiceDistressCooldownRef = useRef(null);
  const redZoneAlertCooldownRef = useRef(null);
  const wsRef = useRef(null);
  const lastDistressTimeRef = useRef(0);
  const smsSentRef = useRef(false); // ✅ SMS sirf ek baar bhejne ke liye

  // Wearable Integration & Quick Dial
  const [wearableConnected, setWearableConnected] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role === "police") {
      navigate("/police");
      return;
    }
    fetchReports();
    fetchPrimaryContact();
    fetchRedZones();
    initializeVoiceRecognition();
    initializeDeviceMotion();
    initializeWebSocket();
  }, [user, token, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchPositionRef.current)
        navigator.geolocation.clearWatch(watchPositionRef.current);
      if (safetyTimerRef.current) clearInterval(safetyTimerRef.current);
      if (voiceDistressCooldownRef.current)
        clearTimeout(voiceDistressCooldownRef.current);
      if (redZoneAlertCooldownRef.current)
        clearTimeout(redZoneAlertCooldownRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
      if (wsRef.current) wsRef.current.close();
      stopCamera();
    };
  }, []);

  // ============ WEBSOCKET & TOAST UTILITIES ============
  function initializeWebSocket() {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsRef.current = new WebSocket(
        `${protocol}//${window.location.hostname}:5000`,
      );
      wsRef.current.onopen = () => console.log("✅ WebSocket connected");
      wsRef.current.onerror = (err) => console.error("WebSocket error:", err);
      wsRef.current.onclose = () => console.log("WebSocket closed");
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
    }
  }

  function showToast(message, duration = 3000) {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), duration);
  }

  // ============ VOICE DISTRESS EMERGENCY WORKFLOW ============
  function getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude, timestamp: Date.now() });
        },
        (error) => {
          const errorMsg =
            error.code === 1
              ? "Permission denied. Please enable location access."
              : error.code === 2
                ? "Location unavailable. Check your GPS/WiFi."
                : error.code === 3
                  ? "Location request timed out. Try again."
                  : "Failed to get location. " + error.message;
          reject(new Error(errorMsg));
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
      );
    });
  }

  async function submitVoiceDistressReport(location, transcript) {
    try {
      const reportPayload = {
        type: "Voice Distress",
        description: `Distress keyword detected via AI voice monitoring: "${transcript}"`,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        auto_triggered: true,
      };

      const response = await fetch("http://localhost:5000/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reportPayload),
      });

      if (!response.ok) throw new Error("Failed to submit report");

      const data = await response.json();
      console.log("✅ Voice distress report submitted:", data);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "new_report",
            report: data.report,
            timestamp: Date.now(),
          }),
        );
      }

      return data.report;
    } catch (err) {
      console.error("Error submitting voice distress report:", err);
      throw err;
    }
  }

  async function notifyPrimaryContact(location, transcript) {
    if (!primaryContact) {
      console.warn("No primary contact available for notification");
      return;
    }

    const mapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;

    try {
      await fetch("http://localhost:5000/contacts/notify", {
        // ✅ sahi URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contact_id: primaryContact.id,
          type: "emergency",
          message: `VOICE DISTRESS ALERT: Distress keyword detected. Location: ${mapsUrl}. Please respond immediately.`,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });
      console.log("✅ Emergency notification sent to primary contact");
    } catch (err) {
      console.error("Error notifying contact:", err);
      const smsBody = `EMERGENCY: Distress detected. Location: ${mapsUrl}`;
      window.location.href = `sms:${primaryContact.phone}?body=${encodeURIComponent(smsBody)}`;
    }
  }

  function startVoiceDistressCooldown() {
    setVoiceDistressCooldown(true);
    voiceDistressCooldownRef.current = setTimeout(() => {
      setVoiceDistressCooldown(false);
    }, 30000);
  }

  function startRedZoneAlertCooldown() {
    setRedZoneAlertCooldown(true);
    redZoneAlertCooldownRef.current = setTimeout(() => {
      setRedZoneAlertCooldown(false);
    }, 300000);
  }

  // ============ RED ZONE FUNCTIONS ============
  async function fetchRedZones() {
    try {
      const response = await fetch("http://localhost:5000/redzones", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRedZones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching redzones:", err);
    }
  }

  function startRedZoneWatch() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    watchPositionRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        checkRedZoneProximity(latitude, longitude);
      },
      (err) => {
        const errorMsg =
          err.code === 1
            ? "Location permission denied."
            : err.code === 2
              ? "Location unavailable."
              : err.code === 3
                ? "Location request timed out."
                : "Location error: " + err.message;
        setError(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  }

  function checkRedZoneProximity(lat, lng) {
    const inRedZone = redZones.some((zone) => {
      const radius = (zone.radiusMeters || 500) / 111000; // meters → degrees
      return (
        Math.abs(zone.center.latitude - lat) < radius &&
        Math.abs(zone.center.longitude - lng) < radius
      );
    });

    if (inRedZone && !redZoneAlert && !redZoneAlertCooldown) {
      setRedZoneAlert(true);
      console.log("🚩 RED ZONE ENTERED");

      // Browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("⚠️ High Risk Area", {
          body: "You have entered a high-risk area. Stay alert.",
        });
      }

      // Vibration
      try {
        navigator.vibrate(500);
      } catch (err) {}

      // Toast
      showToast("🚩 Red Zone! Notifying emergency contact...", 4000);

      // ✅ smsSentRef se ensure karo sirf 1 baar SMS jaaye
      if (primaryContact?.id && !smsSentRef.current) {
        smsSentRef.current = true; // pehle lock karo

        fetch("http://localhost:5000/contacts/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            contact_id: primaryContact.id,
            type: "red_zone_alert",
            message: `Red zone alert. Location: https://maps.google.com/?q=${lat},${lng}`,
            latitude: lat,
            longitude: lng,
          }),
        })
          .then((res) => res.json())
          .then(() => showToast("✅ SMS sent to emergency contact!", 3000))
          .catch((err) => console.error("SMS error:", err));
      } else if (!primaryContact?.id) {
        showToast("⚠️ No emergency contact set!", 3000);
      }

      startRedZoneAlertCooldown();
      lastRedZoneAlertTimeRef.current = Date.now();
      console.log("✅ Red zone alert workflow complete");
    } else if (!inRedZone && redZoneAlert) {
      setRedZoneAlert(false);
      smsSentRef.current = false; // ✅ zone se bahar aao toh reset
    }
  }

  function stopRedZoneWatch() {
    if (watchPositionRef.current) {
      navigator.geolocation.clearWatch(watchPositionRef.current);
      watchPositionRef.current = null;
    }
    setCurrentLocation(null);
    setRedZoneAlert(false);
  }

  // ============ SOS PHOTO & OFFLINE FUNCTIONS ============
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            .play()
            .catch((err) => console.error("Play error:", err));
        };
        setCameraActive(true);
      }
    } catch (err) {
      setError("Camera access denied: " + err.message);
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height,
    );
    setPhotoData(canvasRef.current.toDataURL("image/jpeg"));
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setCameraActive(false);
    }
  }

  async function submitSOSWithPhoto() {
    if (!primaryContact) {
      setError("No emergency contact set");
      return;
    }

    const reportPayload = {
      user_id: user.id,
      type: "sos_emergency",
      description: "Emergency SOS triggered with location and photo",
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
      image_base64: photoData,
    };

    try {
      const response = await fetch("http://localhost:5000/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reportPayload),
      });
      if (response.ok) {
        window.location.href = `sms:${primaryContact.phone}?body=EMERGENCY%20SOS%20ALERT`;
        stopCamera();
        setPhotoData(null);
        fetchReports();
      }
    } catch (err) {
      setError("Failed to submit SOS");
    }
  }

  // ============ SAFETY MODE FUNCTIONS ============
  function toggleSafetyMode() {
    if (safetyModeActive) {
      setSafetyModeActive(false);
      if (safetyTimerRef.current) clearInterval(safetyTimerRef.current);
      if (watchPositionRef.current)
        navigator.geolocation.clearWatch(watchPositionRef.current);
      watchPositionRef.current = null;
    } else {
      setSafetyModeActive(true);
      safetyTimerRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocationHistory((prev) => [
              ...prev.slice(-9),
              { latitude, longitude, timestamp: Date.now() },
            ]);
            lastLocationRef.current = { latitude, longitude };
          },
          (err) => console.error("Location error:", err),
        );
      }, 10000);
      startRedZoneWatch();
    }
  }

  function detectInactivity() {
    if (!safetyModeActive || locationHistory.length < 2) return;
    const last = locationHistory[locationHistory.length - 1];
    const prev = locationHistory[locationHistory.length - 2];
    const timeDiff = last.timestamp - prev.timestamp;
    const distance = Math.sqrt(
      Math.pow(last.latitude - prev.latitude, 2) +
        Math.pow(last.longitude - prev.longitude, 2),
    );
    if (timeDiff > 180000 && distance < 0.0001) {
      triggerInactivityEscalation();
    }
  }

  function triggerInactivityEscalation() {
    setError("⚠️ Inactivity detected! Your primary contact has been notified.");
    if (primaryContact) {
      window.location.href = `sms:${primaryContact.phone}?body=SAFETY%20ALERT:%20User%20inactive.%20Check%20status`;
    }
  }

  // ============ SAFE WALK MODE FUNCTIONS ============
  function toggleSafeWalk() {
    if (safeWalkActive) {
      setSafeWalkActive(false);
      if (watchPositionRef.current)
        navigator.geolocation.clearWatch(watchPositionRef.current);
      watchPositionRef.current = null;
      setLocationHistory([]);
    } else {
      setSafeWalkActive(true);
      setLocationHistory([]);
      startRedZoneWatch();
      const interval = setInterval(() => {
        if (locationHistory.length > 2) {
          const current = locationHistory[locationHistory.length - 1];
          const start = locationHistory[0];
          const deviation = Math.sqrt(
            Math.pow(current.latitude - start.latitude, 2) +
              Math.pow(current.longitude - start.longitude, 2),
          );
          if (deviation > 0.1) setError("⚠️ Route deviation detected");
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }

  // ============ VOICE DISTRESS DETECTION ============
  function initializeVoiceRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript.toLowerCase();
      }
      if (
        distressKeywords.some((keyword) => transcript.includes(keyword)) &&
        !voiceDistressCooldown
      ) {
        triggerVoiceDistressAlert(transcript);
      }
    };

    recognition.onerror = (err) =>
      console.error("Speech recognition error:", err);
    recognitionRef.current = recognition;
  }

  const toggleVoiceDetection = () => {
    if (!recognitionRef.current) initializeVoiceRecognition();
    if (voiceDetectionActive) {
      recognitionRef.current.abort();
      setVoiceDetectionActive(false);
    } else {
      recognitionRef.current.start();
      setVoiceDetectionActive(true);
    }
  };

  async function triggerVoiceDistressAlert(transcript) {
    console.log(`🎙️ Voice distress detected: "${transcript}"`);

    const now = Date.now();
    if (now - lastDistressTimeRef.current < 30000) return;
    lastDistressTimeRef.current = now;
    startVoiceDistressCooldown();

    let location;
    try {
      showToast("📍 Getting location...", 2000);
      location = await getCurrentLocation();
    } catch (err) {
      showToast("⚠️ Could not get location, proceeding...", 2000);
      location = {
        latitude: currentLocation?.latitude || 0,
        longitude: currentLocation?.longitude || 0,
        timestamp: Date.now(),
      };
    }

    try {
      navigator.vibrate([300, 200, 300, 200, 300]);
    } catch (err) {}

    try {
      await submitVoiceDistressReport(location, transcript);
    } catch (err) {
      showToast("⚠️ Could not save report, but notifying contact...", 2000);
    }

    try {
      await notifyPrimaryContact(location, transcript);
    } catch (err) {
      console.error("Contact notification error:", err);
    }

    if (autoCallEnabled && primaryContact) {
      window.location.href = `tel:${primaryContact.phone}`;
    }

    showToast("🚨 Emergency Alert Sent to Primary Contact", 5000);
    fetchReports();
  }

  // ============ PANIC GESTURE DETECTION ============
  function initializeDeviceMotion() {
    if (!window.DeviceMotionEvent) return;
  }

  function toggleGestureDetection() {
    if (gestureDetectionActive) {
      window.removeEventListener("devicemotion", handleDeviceMotion);
      setGestureDetectionActive(false);
    } else {
      window.addEventListener("devicemotion", handleDeviceMotion);
      setGestureDetectionActive(true);
    }
  }

  function handleDeviceMotion(event) {
    const { x, y, z } = event.acceleration || {};
    if (!x || !y || !z) return;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    if (magnitude > 50) triggerPanicGestureAlert();
  }

  function triggerPanicGestureAlert() {
    setError("⚠️ Panic gesture detected (shake)");
    if (primaryContact) {
      navigator.vibrate([100, 50, 100, 50, 100]);
      window.location.href = `sms:${primaryContact.phone}?body=PANIC%20GESTURE%20ALERT:%20Shake%20detected`;
    }
  }

  // ============ WEARABLE INTEGRATION ============
  async function simulateWearableAlert() {
    try {
      const response = await fetch(
        "http://localhost:5000/reports/wearable-alert",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            source: "smartwatch_simulator",
            metadata: { button: "sos_button", timestamp: Date.now() },
          }),
        },
      );
      if (response.ok) {
        setSosTriggered(true);
        setTimeout(() => setSosTriggered(false), 3000);
      }
    } catch (err) {
      console.error("Wearable alert error:", err);
    }
  }

  async function pairWearable() {
    setWearableConnected(true);
  }

  // ============ EXISTING FUNCTIONS ============
  async function fetchReports() {
    try {
      const response = await fetch("http://localhost:5000/reports/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setReports(data.reports || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchPrimaryContact() {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/contacts/primary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setPrimaryContact(data.contact || null);
    } catch (err) {
      console.error("Error fetching primary contact:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>🛡️ User Safety Dashboard</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span>Welcome, {user?.name}</span>
          <button className="btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {error && (
          <div
            className="error-message"
            style={{
              color: "#ff1744",
              padding: "12px",
              borderRadius: "4px",
              marginBottom: "12px",
            }}
          >
            {error}
          </div>
        )}

        {toastVisible && (
          <div className="toast-notification">{toastMessage}</div>
        )}

        {/* ============ QUICK DIAL SECTION ============ */}
        <section className="feature-section quick-dial-section">
          <h2>🚨 Quick Dial & Emergency Contact</h2>
          {primaryContact ? (
            <div className="quick-dial-card">
              <div className="contact-display">
                <div className="contact-name">{primaryContact.name}</div>
                <div className="contact-phone">{primaryContact.phone}</div>
              </div>
              <div className="quick-dial-buttons">
                <a href={`tel:${primaryContact.phone}`} className="btn-call">
                  📞 Call
                </a>
                <a href={`sms:${primaryContact.phone}`} className="btn-sms">
                  💬 Message
                </a>
              </div>
            </div>
          ) : (
            <div className="quick-dial-empty">
              <p>No primary contact set</p>
              <button
                className="btn-primary"
                onClick={() => navigate("/contacts")}
              >
                Set Emergency Contact
              </button>
            </div>
          )}
        </section>

        {/* ============ RED ZONE DETECTION ============ */}
        <section className="feature-section red-zone-section">
          <h2>🚩 Red Zone Detection</h2>
          <div className="control-group">
            <button
              className={`btn-mode ${redZoneAlert ? "in-redzone" : ""}`}
              onClick={() =>
                redZones.length > 0
                  ? watchPositionRef.current
                    ? stopRedZoneWatch()
                    : startRedZoneWatch()
                  : setError("No red zones available")
              }
              disabled={redZoneAlertCooldown}
            >
              {redZoneAlert
                ? "⚠️ IN RED ZONE!"
                : watchPositionRef.current
                  ? "✓ Watching"
                  : "🔴 Start Watch"}
              {redZoneAlertCooldown && " (Cooldown: 5 min)"}
            </button>
          </div>

          <div
            style={{
              background: "#f0f7ff",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #b3d9ff",
              marginTop: "12px",
              fontSize: "0.9em",
              color: "#555",
            }}
          >
            📱 Jaise hi tum red zone mein aao — automatic SMS primary contact ko
            jaayega
          </div>

          {currentLocation && (
            <p className="status-text">
              📍 Current: {currentLocation.latitude.toFixed(4)},{" "}
              {currentLocation.longitude.toFixed(4)}
            </p>
          )}
          {redZoneAlert && (
            <div className="alert-box">
              <strong>⚠️ YOU ARE IN A HIGH-RISK AREA!</strong>
              <p>Stay alert and consider moving to a safer location.</p>
            </div>
          )}
          {redZoneAlertCooldown && (
            <div
              style={{
                background: "#fff3cd",
                border: "1px solid #ffc107",
                color: "#856404",
                padding: "10px",
                borderRadius: "4px",
                marginTop: "10px",
                fontSize: "0.9em",
              }}
            >
              ⏱️ Cooldown active (5 minutes). Next alert will trigger when you
              re-enter a red zone.
            </div>
          )}
          <p className="info-text">
            {redZones.length} high-risk zones detected in area
          </p>
        </section>

        {/* ============ SOS PHOTO CAPTURE ============ */}
        <section className="feature-section sos-photo-section">
          <h2>📸 SOS Photo Capture</h2>
          {!cameraActive ? (
            <button className="btn-primary" onClick={startCamera}>
              🎥 Open Camera
            </button>
          ) : (
            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "400px",
                  borderRadius: "8px",
                  backgroundColor: "#000",
                  display: "block",
                  objectFit: "cover",
                }}
              />
              <canvas
                ref={canvasRef}
                width="640"
                height="480"
                style={{ display: "none" }}
              />
              <div className="camera-controls">
                <button className="btn-secondary" onClick={capturePhoto}>
                  📷 Capture Photo
                </button>
                <button className="btn-secondary" onClick={stopCamera}>
                  ✕ Close Camera
                </button>
              </div>
            </div>
          )}
          {photoData && (
            <div className="photo-preview">
              <img
                src={photoData}
                alt="Captured"
                style={{
                  maxWidth: "100%",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
              />
              <button
                className="btn-primary"
                onClick={submitSOSWithPhoto}
                style={{ width: "100%" }}
              >
                📤 Submit SOS with Photo
              </button>
            </div>
          )}
        </section>

        {/* ============ SAFETY MODE ============ */}
        <section className="feature-section safety-mode-section">
          <h2>🛡️ Safety Mode</h2>
          <div className="mode-card">
            <button
              className={`btn-mode ${safetyModeActive ? "active" : ""}`}
              onClick={toggleSafetyMode}
            >
              {safetyModeActive ? "✓ Safety Mode ON" : "Safety Mode OFF"}
            </button>
            <p className="info-text">
              Periodic location updates, inactivity detection & escalation
            </p>
            {safetyModeActive && (
              <div className="tracking-info">
                <p>📍 Last {locationHistory.length} location(s) recorded</p>
                <button className="btn-secondary" onClick={detectInactivity}>
                  Check Inactivity
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ============ SAFE WALK MODE ============ */}
        <section className="feature-section safe-walk-section">
          <h2>🚶 Safe Walk Mode</h2>
          <div className="mode-card">
            <button
              className={`btn-mode ${safeWalkActive ? "active" : ""}`}
              onClick={toggleSafeWalk}
            >
              {safeWalkActive ? "✓ Safe Walk ON" : "Safe Walk OFF"}
            </button>
            <p className="info-text">
              Real-time route tracking with deviation alerts
            </p>
            {safeWalkActive && (
              <p className="status-text">
                🗺️ {locationHistory.length} checkpoints recorded
              </p>
            )}
          </div>
        </section>

        {/* ============ VOICE DISTRESS DETECTION ============ */}
        <section className="feature-section voice-detection-section">
          <h2>🎙️ Voice Distress Detection</h2>
          <div className="mode-card">
            <button
              className={`btn-mode ${voiceDetectionActive ? "active" : ""}`}
              onClick={toggleVoiceDetection}
              disabled={voiceDistressCooldown}
            >
              {voiceDetectionActive ? "🎙️ Listening..." : "Voice Detection OFF"}
              {voiceDistressCooldown && " (Cooldown: 30s)"}
            </button>
            <p className="info-text">
              Listens for distress keywords: {distressKeywords.join(", ")}
            </p>

            <div className="auto-call-setting">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "15px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={autoCallEnabled}
                  onChange={(e) => setAutoCallEnabled(e.target.checked)}
                  style={{ cursor: "pointer", width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "0.95em", color: "#333" }}>
                  📞 Auto Call Primary Contact
                </span>
              </label>
            </div>

            {voiceDistressCooldown && (
              <div
                style={{
                  background: "#fff3cd",
                  border: "1px solid #ffc107",
                  color: "#856404",
                  padding: "10px",
                  borderRadius: "4px",
                  marginTop: "10px",
                  fontSize: "0.9em",
                }}
              >
                ⏱️ Cooldown active. Please wait before next detection.
              </div>
            )}
          </div>
        </section>

        {/* ============ PANIC GESTURE DETECTION ============ */}
        <section className="feature-section gesture-detection-section">
          <h2>📳 Panic Gesture Detection</h2>
          <div className="mode-card">
            <button
              className={`btn-mode ${gestureDetectionActive ? "active" : ""}`}
              onClick={toggleGestureDetection}
            >
              {gestureDetectionActive
                ? "📳 Shake Detected"
                : "Gesture Detection OFF"}
            </button>
            <p className="info-text">
              Detects aggressive shaking to trigger SOS alert
            </p>
          </div>
        </section>

        {/* ============ WEARABLE INTEGRATION ============ */}
        <section className="feature-section wearable-section">
          <h2>⌚ Wearable Integration</h2>
          <div className="mode-card">
            {!wearableConnected ? (
              <button className="btn-primary" onClick={pairWearable}>
                ⌚ Pair Wearable Device
              </button>
            ) : (
              <div>
                <p className="status-text">✓ Wearable Connected</p>
                <button
                  className={`btn-mode ${sosTriggered ? "active" : ""}`}
                  onClick={simulateWearableAlert}
                >
                  {sosTriggered ? "🔴 SOS Triggered!" : "Simulate SOS Button"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ============ MAIN ACTIONS ============ */}
        <div className="dashboard-actions">
          <button className="btn-primary" onClick={() => navigate("/report")}>
            📋 Submit New Report
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate("/contacts")}
          >
            📞 Manage Contacts
          </button>
          <button className="btn-secondary" onClick={fetchReports}>
            🔄 Refresh Reports
          </button>
        </div>

        {/* ============ REPORTS LIST ============ */}
        <h2>📋 Your Reports</h2>
        {reports.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
            <p>No reports yet. Submit your first report to get started.</p>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map((report) => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <h3>{report.type}</h3>
                  <span className={`status-badge status-${report.status}`}>
                    {report.status}
                  </span>
                </div>
                <p className="report-description">{report.description}</p>
                {report.latitude && report.longitude && (
                  <p className="report-location">
                    📍 {report.latitude.toFixed(4)},{" "}
                    {report.longitude.toFixed(4)}
                  </p>
                )}
                <p className="report-timestamp">
                  📅 {new Date(report.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      <style>{`
        .dashboard-container { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
        .dashboard-header { background: white; padding: 20px; borderRadius: 8px; marginBottom: 20px; display: flex; justifyContent: space-between; alignItems: center; boxShadow: 0 2px 8px rgba(0,0,0,0.1); }
        .dashboard-header h1 { margin: 0; color: #333; }
        .dashboard-content { background: white; padding: 20px; borderRadius: 8px; boxShadow: 0 2px 8px rgba(0,0,0,0.1); position: relative; }
        .toast-notification { position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 16px 24px; borderRadius: 8px; boxShadow: 0 4px 12px rgba(0,0,0,0.15); fontSize: 0.95em; fontWeight: 500; zIndex: 9999; animation: slideIn 0.3s ease-in-out; }
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .feature-section { marginBottom: 25px; paddingBottom: 20px; borderBottom: 2px solid #f0f0f0; }
        .feature-section h2 { margin: 0 0 15px 0; color: #667eea; fontSize: 1.2em; }
        .quick-dial-section .quick-dial-card { background: linear-gradient(135deg, #ff1744 0%, #c41c3b 100%); color: white; padding: 20px; borderRadius: 8px; }
        .contact-display { marginBottom: 15px; }
        .contact-name { fontSize: 1.3em; fontWeight: bold; }
        .contact-phone { fontSize: 1.1em; opacity: 0.95; }
        .quick-dial-buttons { display: flex; gap: 10px; }
        .btn-call, .btn-sms { flex: 1; padding: 12px; borderRadius: 4px; border: none; cursor: pointer; fontWeight: bold; textDecoration: none; color: white; textAlign: center; }
        .btn-call { background: #4CAF50; }
        .btn-sms { background: #2196F3; }
        .quick-dial-empty { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 20px; borderRadius: 8px; textAlign: center; }
        .red-zone-section .control-group { marginBottom: 10px; }
        .mode-card { background: #f9f9f9; padding: 15px; borderRadius: 8px; border: 1px solid #e0e0e0; }
        .btn-mode { width: 100%; padding: 12px; borderRadius: 6px; border: none; cursor: pointer; fontWeight: bold; fontSize: 1em; background: #e0e0e0; color: #333; transition: all 0.3s; }
        .btn-mode.active { background: #4CAF50; color: white; }
        .btn-mode.in-redzone { background: #ff1744; color: white; animation: pulse 1s infinite; }
        .btn-mode:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .alert-box { background: #ffebee; border-left: 4px solid #ff1744; padding: 12px; borderRadius: 4px; marginTop: 10px; }
        .status-text { color: #666; font-size: 0.95em; margin: 8px 0; }
        .info-text { color: #999; font-size: 0.9em; marginTop: 10px; }
        .camera-container { marginTop: 15px; backgroundColor: #000; borderRadius: 8px; overflow: hidden; }
        .camera-controls { display: flex; gap: 10px; padding: 10px; }
        .camera-controls button { flex: 1; }
        .photo-preview { marginTop: 15px; }
        .tracking-info { background: #f0f7ff; padding: 10px; borderRadius: 6px; marginTop: 10px; }
        .dashboard-actions { display: flex; gap: 10px; marginBottom: 20px; flexWrap: wrap; }
        .btn-primary, .btn-secondary { padding: 10px 20px; borderRadius: 4px; border: none; cursor: pointer; fontWeight: bold; transition: all 0.3s; }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover:not(:disabled) { background: #5568d3; }
        .btn-secondary { background: #f0f0f0; color: #333; border: 1px solid #ddd; }
        .btn-secondary:hover:not(:disabled) { background: #e0e0e0; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .reports-list { display: grid; gap: 15px; }
        .report-card { border: 1px solid #e0e0e0; borderRadius: 8px; padding: 15px; backgroundColor: #f9f9f9; }
        .report-header { display: flex; justifyContent: space-between; alignItems: center; marginBottom: 10px; }
        .report-header h3 { margin: 0; color: #333; }
        .status-badge { padding: 4px 12px; borderRadius: 20px; fontSize: 0.85em; fontWeight: bold; textTransform: uppercase; }
        .status-pending { backgroundColor: #fff3cd; color: #856404; }
        .status-investigating { backgroundColor: #cfe2ff; color: #084298; }
        .status-resolved { backgroundColor: #d1e7dd; color: #0f5132; }
        .report-description { color: #555; margin: 8px 0; lineHeight: 1.5; }
        .report-location { color: #666; fontSize: 0.95em; margin: 5px 0; }
        .report-timestamp { color: #999; fontSize: 0.9em; margin: 5px 0; }
      `}</style>
    </div>
  );
}

export default UserDashboard;
