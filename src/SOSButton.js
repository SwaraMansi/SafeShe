import api from "./api";
import { useState } from "react";

export default function SOSButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const sendSOS = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const getLocation = () => new Promise((resolve, reject) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => resolve(null),
        { timeout: 8000 }
      );
    });

    try {
      const location = await getLocation();

      const payload = { description: 'SOS', location };
      const res = await api.post('/api/report/sos', payload);

      setResult(res);
    } catch (err) {
      console.error('SOS error', err);
      setError('Failed to send SOS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: '20px' }}>
      <button
        onClick={sendSOS}
        style={{ padding: '12px 20px', background: 'red', color: 'white', border: 'none', borderRadius: 6 }}
        disabled={loading}
      >
        {loading ? 'Sending SOS...' : 'Send SOS (Share location)'}
      </button>

      {result && (
        <div style={{ marginTop: 10, padding: 10, border: '1px solid #ddd' }}>
          <strong>Response:</strong>
          <div>Risk Score: {result.report?.riskScore ?? result.report?.risk ?? 'N/A'}</div>
          <div>Category: {result.report?.category ?? 'N/A'}</div>
        </div>
      )}

      {error && <div style={{ marginTop: 10, color: 'red' }}>{error}</div>}
    </div>
  );
}