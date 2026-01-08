import api from "./api";
import { useState } from "react";

export default function ReportForm() {
  const [desc, setDesc] = useState("");
  const [shareLocation, setShareLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  const getLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    );
  });

  const submitReport = async () => {
    // frontend validation
    if (!desc.trim()) {
      alert("Please enter incident description");
      return;
    }

    try {
      setLoading(true);

      let location = null;
      if (shareLocation) {
        location = await getLocation();
      }

      // using proxy → NO localhost:5000 here
      await api.post("/api/report", {
        description: desc,
        location
      });

      alert("Report submitted successfully ✅");
      setDesc("");
      setShareLocation(false);
    } catch (error) {
      console.error("Submit error:", error);
      alert("Local server error – cannot submit report ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "20px", padding: "10px", border: "1px solid #ccc" }}>
      <h2>Report Incident</h2>

      <textarea
        placeholder="Describe the incident (what happened, where, when)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={4}
        cols={50}
      />

      <br />
      <label>
        <input type="checkbox" checked={shareLocation} onChange={(e) => setShareLocation(e.target.checked)} /> Share my location with this report
      </label>

      <br />
      <br />

      <button onClick={submitReport} disabled={loading}>
        {loading ? "Submitting..." : "Submit Report"}
      </button>
    </div>
  );
}
