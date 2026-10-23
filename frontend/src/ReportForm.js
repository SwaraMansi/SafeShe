import api from "./api";
import { useState } from "react";

export default function ReportForm() {
  const [desc, setDesc] = useState("");
  const [incidentType, setIncidentType] = useState("harassment");
  const [shareLocation, setShareLocation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const getLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    );
  });

  const submitReport = async () => {
    if (!desc.trim()) {
      setError("Please add a few details so the report can be understood.");
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setError("");

      let location = null;
      if (shareLocation) {
        location = await getLocation();
      }

      const report = {
        id: `DEMO-${Date.now().toString().slice(-6)}`,
        description: desc,
        category: incidentType,
        location,
        createdAt: new Date().toISOString()
      };

      try {
        const response = await api.post("/api/report", {
          description: desc,
          category: incidentType,
          location
        });
        setResult({ ...response, demo: false });
      } catch (requestError) {
        console.warn("Response service unavailable; keeping report in demo mode.", requestError);
        setResult({ ...report, demo: true });
      }
      setDesc("");
      setIncidentType("harassment");
      setTimeout(() => setResult(null), 7000);
    } catch (error) {
      console.error("Submit error:", error);
      setError("We could not prepare this report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const incidentTypes = [
    { value: "harassment", label: "🚫 Sexual Harassment" },
    { value: "assault", label: "⚠️ Physical Assault" },
    { value: "stalking", label: "👁️ Stalking" },
    { value: "threat", label: "💬 Threat/Abuse" },
    { value: "theft", label: "🎒 Theft" },
    { value: "other", label: "📝 Other" }
  ];

  return (
    <div className="card">
      <div className="section-heading">
        <div><p className="eyebrow">Private and secure</p><h2>Report an incident</h2></div>
        <span className="form-assurance">⌁ Anonymous by default</span>
      </div>
      <p className="form-intro">Share only what feels safe. You can submit without your name, and location sharing is always your choice.</p>

      <div className="form-group">
        <label htmlFor="incidentType">What happened?</label>
        <select 
          value={incidentType}
          onChange={(e) => setIncidentType(e.target.value)}
          id="incidentType"
        >
          {incidentTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="incidentDescription">Tell us what happened</label>
        <textarea
          id="incidentDescription"
          placeholder="Include what happened, when it happened, and anything responders should know..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={6}
        />
      </div>

      <div className="form-group checkbox-group">
        <input 
          type="checkbox" 
          checked={shareLocation} 
          onChange={(e) => setShareLocation(e.target.checked)}
          id="shareLocation"
        />
        <label htmlFor="shareLocation">
          Share my approximate location with responders
        </label>
      </div>

      <button 
        type="button"
        className="submit-button"
        onClick={submitReport} 
        disabled={loading}
      >
        {loading ? "Preparing report..." : "Submit report"}
      </button>

      {result && (
        <div className={`success-message ${result.demo ? "demo-message" : ""}`} role="status">
          <strong>{result.demo ? "Report saved in demo mode" : "Report submitted successfully"}</strong>
          <span> Reference ID: {result._id?.substring(0, 8) || result.id}</span>
        </div>
      )}
      {error && <div className="error-message" role="alert">{error}</div>}
    </div>
  );
}
