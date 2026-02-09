import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function ReportPage() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: 'harassment',
    description: '',
    latitude: null,
    longitude: null
  });
  const [locationStatus, setLocationStatus] = useState('pending'); // pending, loading, success, error, denied
  const [locationError, setLocationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
    // Request geolocation on page load
    requestGeolocation();
  }, [user, navigate]);

  function requestGeolocation() {
    setLocationStatus('loading');
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Geolocation not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, latitude, longitude }));
        setLocationStatus('success');
        console.log('✅ Location obtained:', latitude, longitude);
      },
      (error) => {
        setLocationStatus('error');
        let msg = 'Failed to get location';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please enable it in browser settings.';
          setLocationStatus('denied');
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location data unavailable. Please try again.';
        }
        setLocationError(msg);
        console.error('❌ Location error:', msg, error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setSuccessMessage('');

    if (!formData.description.trim()) {
      setSubmitError('Please describe the incident');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      setSubmitError('Location is required. Please allow location access.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to submit report');

      setSuccessMessage('✅ Report submitted successfully!');
      console.log('✅ Report submitted:', data.report);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/user');
      }, 2000);
    } catch (err) {
      setSubmitError(err.message);
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="report-page-container">
      <div className="report-card-wrapper">
        <h2>📋 Submit Safety Report</h2>

        {/* Geolocation Status */}
        <div className={`location-status location-${locationStatus}`}>
          {locationStatus === 'loading' && (
            <p>📍 Getting your location...</p>
          )}
          {locationStatus === 'success' && (
            <p>✅ Location obtained: {formData.latitude?.toFixed(4)}, {formData.longitude?.toFixed(4)}</p>
          )}
          {locationStatus === 'error' && (
            <div>
              <p>⚠️ {locationError}</p>
              <button className="btn-small" onClick={requestGeolocation}>Retry Location</button>
            </div>
          )}
          {locationStatus === 'denied' && (
            <div>
              <p>❌ {locationError}</p>
              <p style={{ fontSize: '0.9em', marginTop: '8px' }}>
                Steps to enable: Settings → Privacy → Location → Allow for this site
              </p>
              <button className="btn-small" onClick={requestGeolocation}>Retry Location</button>
            </div>
          )}
        </div>

        {/* Error Messages */}
        {submitError && (
          <div className="error-message" style={{ color: '#ff1744', marginBottom: '12px' }}>
            {submitError}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="success-message" style={{ color: '#4caf50', marginBottom: '12px' }}>
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Report Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
              disabled={isSubmitting}
            >
              <option value="harassment">Harassment</option>
              <option value="stalking">Stalking</option>
              <option value="assault">Assault</option>
              <option value="threat">Threat</option>
              <option value="suspicious_activity">Suspicious Activity</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what happened..."
              rows={5}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={
                formData.latitude && formData.longitude
                  ? `${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)}`
                  : 'Waiting for location...'
              }
              disabled
              style={{opacity: 0.7}}
            />
          </div>

          <div className="button-group">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !formData.latitude || !formData.longitude}
            >
              {isSubmitting ? 'Submitting...' : '✅ Submit Report'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/user')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .report-page-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          display: flex;
          alignItems: center;
          justifyContent: center;
        }

        .report-card-wrapper {
          background: white;
          borderRadius: 12px;
          padding: 30px;
          maxWidth: 500px;
          width: 100%;
          boxShadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .report-card-wrapper h2 {
          margin: 0 0 20px 0;
          color: #333;
          textAlign: center;
        }

        .location-status {
          padding: 12px;
          borderRadius: 8px;
          marginBottom: 20px;
          fontSize: 0.95em;
        }

        .location-loading {
          backgroundColor: #e3f2fd;
          color: #1976d2;
          border: 1px solid #1976d2;
        }

        .location-success {
          backgroundColor: #c8e6c9;
          color: #2e7d32;
          border: 1px solid #2e7d32;
        }

        .location-error {
          backgroundColor: #ffcdd2;
          color: #c62828;
          border: 1px solid #c62828;
        }

        .location-denied {
          backgroundColor: #fff3cd;
          color: #856404;
          border: 1px solid #856404;
        }

        .location-pending {
          backgroundColor: #f5f5f5;
          color: #666;
          border: 1px solid #ddd;
        }

        .location-status p {
          margin: 5px 0;
        }

        .form-group {
          marginBottom: 20px;
        }

        .form-group label {
          display: block;
          marginBottom: 8px;
          fontWeight: bold;
          color: #333;
        }

        .form-group select,
        .form-group textarea,
        .form-group input {
          width: 100%;
          padding: 10px;
          borderRadius: 4px;
          border: 1px solid #ddd;
          fontFamily: inherit;
          fontSize: 1em;
          boxSizing: border-box;
        }

        .form-group textarea {
          resize: vertical;
          fontFamily: 'Segoe UI', sans-serif;
        }

        .form-group input:disabled,
        .form-group select:disabled,
        .form-group textarea:disabled {
          backgroundColor: #f5f5f5;
          cursor: not-allowed;
        }

        .button-group {
          display: flex;
          gap: 10px;
          marginTop: 20px;
        }

        .btn-primary, .btn-secondary, .btn-small {
          padding: 10px 20px;
          borderRadius: 4px;
          border: none;
          cursor: pointer;
          fontWeight: bold;
          transition: all 0.3s;
          fontSize: 1em;
        }

        .btn-primary {
          background: #667eea;
          color: white;
          flex: 1;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5568d3;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
          flex: 1;
          border: 1px solid #ddd;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .btn-small {
          background: #fff;
          color: #667eea;
          border: 1px solid #667eea;
          padding: 6px 12px;
          fontSize: 0.9em;
          marginTop: 8px;
        }

        .btn-small:hover:not(:disabled) {
          background: #f0f0ff;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          backgroundColor: #ffe6e6;
          border: 1px solid #ff1744;
          padding: 12px;
          borderRadius: 4px;
        }

        .success-message {
          backgroundColor: #e6ffe6;
          border: 1px solid #4caf50;
          padding: 12px;
          borderRadius: 4px;
        }
      `}</style>
    </div>
  );
}

export default ReportPage;
