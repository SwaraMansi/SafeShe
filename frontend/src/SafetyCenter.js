import { useEffect, useRef, useState } from "react";

const triggerWords = ["help", "stop", "danger", "emergency"];

export default function SafetyCenter() {
  const [location, setLocation] = useState(null);
  const [zoneStatus, setZoneStatus] = useState("Monitoring ready");
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Voice trigger is off");
  const [motionActive, setMotionActive] = useState(false);
  const [motionStatus, setMotionStatus] = useState("Shake detection is off");
  const [cameraActive, setCameraActive] = useState(false);
  const [evidenceStatus, setEvidenceStatus] = useState("Camera is off");
  const [smartMode, setSmartMode] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [offlineStatus, setOfflineStatus] = useState("");
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastShakeRef = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation || typeof navigator.geolocation.watchPosition !== "function") {
      setZoneStatus("Location permission required");
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setLocation(next);
        setZoneStatus("Area monitored · no active warning");
      },
      () => setZoneStatus("Location permission required"),
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }
    );

    return () => {
      if (typeof navigator.geolocation.clearWatch === "function") {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  useEffect(() => {
    if (!smartMode) return undefined;
    const checkIn = () => setLastCheckIn(new Date());
    checkIn();
    const interval = setInterval(checkIn, 10000);
    return () => clearInterval(interval);
  }, [smartMode]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (voiceActive) {
      recognitionRef.current?.stop();
      setVoiceActive(false);
      setVoiceStatus("Voice trigger is off");
      return;
    }
    if (!SpeechRecognition) {
      setVoiceStatus("Not supported in this browser · demo ready");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const phrase = event.results[event.results.length - 1][0].transcript.toLowerCase();
      const matched = triggerWords.find((word) => phrase.includes(word));
      if (matched) setVoiceStatus(`Trigger heard: “${matched}” · demo SOS prepared`);
    };
    recognition.onerror = () => setVoiceStatus("Microphone permission needed");
    recognition.onend = () => {
      if (voiceActive) recognition.start();
    };
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceActive(true);
    setVoiceStatus("Listening for help, stop, or danger");
  };

  const toggleMotion = async () => {
    if (motionActive) {
      window.removeEventListener("devicemotion", handleMotion);
      setMotionActive(false);
      setMotionStatus("Shake detection is off");
      return;
    }
    if (typeof DeviceMotionEvent === "undefined") {
      setMotionStatus("Motion sensors unavailable · demo ready");
      return;
    }
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== "granted") {
        setMotionStatus("Motion permission denied");
        return;
      }
    }
    window.addEventListener("devicemotion", handleMotion);
    setMotionActive(true);
    setMotionStatus("Shake detection active");
  };

  const handleMotion = (event) => {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;
    const force = Math.abs(acceleration.x || 0) + Math.abs(acceleration.y || 0) + Math.abs(acceleration.z || 0);
    if (force > 38 && Date.now() - lastShakeRef.current > 2500) {
      lastShakeRef.current = Date.now();
      setMotionStatus("Rapid shake detected · demo SOS prepared");
    }
  };

  const toggleCamera = async () => {
    if (cameraActive) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
      setEvidenceStatus("Camera is off");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setEvidenceStatus("Camera unavailable · capture demo ready");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      setEvidenceStatus("Evidence camera ready");
    } catch {
      setEvidenceStatus("Camera permission needed");
    }
  };

  const captureEvidence = () => {
    if (!cameraActive || !videoRef.current) {
      setEvidenceStatus("Demo snapshot prepared · camera is not connected");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    setEvidenceStatus("Snapshot captured locally · not uploaded");
  };

  const prepareSms = () => {
    const message = location
      ? `I need help. My location: https://maps.google.com/?q=${location.lat},${location.lng}`
      : "I need help. Please call me.";
    setOfflineStatus(message);
  };

  return (
    <section className="safety-center" aria-labelledby="safety-tools-title">
      <div className="safety-center-heading">
        <div><p className="eyebrow">Protection tools</p><h2 id="safety-tools-title">Your safety layer</h2><p>Optional browser-powered tools that keep working during a presentation or offline demo.</p></div>
        <span className="preview-pill">Frontend preview</span>
      </div>
      <div className="safety-tools-grid">
        <article className="safety-tool-card zone-tool"><span className="tool-symbol">⌖</span><div><h3>Red zone guard</h3><p>{zoneStatus}</p><small>{location ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : "Waiting for location"}</small></div><span className="tool-state active">Watching</span></article>
        <article className="safety-tool-card"><span className="tool-symbol">◉</span><div><h3>Voice distress</h3><p>{voiceStatus}</p></div><button type="button" className={`tool-toggle ${voiceActive ? "on" : ""}`} onClick={toggleVoice}>{voiceActive ? "Stop" : "Start"}</button></article>
        <article className="safety-tool-card"><span className="tool-symbol">⌁</span><div><h3>Panic gesture</h3><p>{motionStatus}</p></div><button type="button" className={`tool-toggle ${motionActive ? "on" : ""}`} onClick={toggleMotion}>{motionActive ? "Stop" : "Enable"}</button></article>
        <article className={`safety-tool-card evidence-card ${cameraActive ? "camera-active" : ""}`}><span className="tool-symbol">▣</span><div><h3>Auto-evidence</h3><p>{evidenceStatus}</p></div><button type="button" className={`tool-toggle ${cameraActive ? "on" : ""}`} onClick={toggleCamera}>{cameraActive ? "Stop" : "Enable"}</button><video ref={videoRef} autoPlay muted playsInline aria-label="Evidence camera preview" /><button type="button" className="capture-button" onClick={captureEvidence}>Capture snapshot</button></article>
        <article className={`safety-tool-card smart-card ${smartMode ? "enabled" : ""}`}><span className="tool-symbol">◷</span><div><h3>Smart safety mode</h3><p>{smartMode ? `Check-in active${lastCheckIn ? ` · ${lastCheckIn.toLocaleTimeString()}` : ""}` : "10-second safety check-ins"}</p></div><button type="button" className={`tool-toggle ${smartMode ? "on" : ""}`} onClick={() => setSmartMode(!smartMode)}>{smartMode ? "On" : "Start"}</button></article>
        <article className="safety-tool-card offline-card"><span className="tool-symbol">✉</span><div><h3>Offline SMS fallback</h3><p>{offlineStatus || "Prepare a message with your map location"}</p></div><button type="button" className="tool-toggle on" onClick={prepareSms}>Prepare SMS</button>{offlineStatus && <a href={`sms:?body=${encodeURIComponent(offlineStatus)}`} className="sms-link">Open messages</a>}</article>
      </div>
    </section>
  );
}
