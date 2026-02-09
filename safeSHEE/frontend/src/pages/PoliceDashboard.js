import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const API = process.env.REACT_APP_API || 'http://localhost:5000';

function PoliceDashboard(){
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [criticalAlerts, setCriticalAlerts] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'police') {
      navigate('/user');
      return;
    }
    fetchReports();
    // Refresh every 15 seconds
    const interval = setInterval(fetchReports, 15000);
    
    // Initialize WebSocket for real-time updates - NEW
    initializeWebSocket();
    
    return () => clearInterval(interval);
  }, [user, token, navigate]);

  // NEW: Initialize WebSocket for real-time report updates
  function initializeWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.hostname}:5000`);
      
      ws.onopen = () => {
        console.log('✅ Police Dashboard WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 WebSocket message received:', data.type);
          
          // Handle new alert broadcasts
          if (data.type === 'new_alert' || data.type === 'alert_update') {
            console.log('🚨 New report received via WebSocket:', data.alert);
            // Refresh reports immediately
            fetchReports();
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
      
      ws.onclose = () => {
        console.log('WebSocket closed');
        // Reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
    }
  }

  async function fetchReports(){
    setLoading(true);
    setError(null);
    try{
      const res = await fetch(`${API}/reports`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      if (res.status === 401) { 
        setError('Unauthorized: Invalid token'); 
        return; 
      }
      if (!res.ok) { 
        setError(`Error: ${res.statusText}`); 
        return; 
      }

      const data = await res.json();
      const reportsData = data.reports || [];
      setReports(reportsData);
      
      // Identify critical alerts (predicted_risk_score > 85)
      const critical = reportsData.filter(r => r.predicted_risk_score > 85 && r.status !== 'resolved');
      setCriticalAlerts(critical);
      
      console.log('📊 Reports with AI predictions loaded:', reportsData);
      if (critical.length > 0) {
        console.log('🚨 CRITICAL ALERTS:', critical.length);
      }
    }catch(err){
      console.error('Fetch reports error:', err);
      setError(`Network error: ${err.message}`);
    }finally{
      setLoading(false);
    }
  }

  async function updateReportStatus(reportId, newStatus) {
    try {
      const res = await fetch(`${API}/reports/${reportId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, status: newStatus } : r
      ));
      console.log('✅ Report status updated:', newStatus);
    } catch (err) {
      console.error('Update status error:', err);
      alert('Failed to update status: ' + err.message);
    }
  }

  // Use predicted_risk_score for priority (AI-based)
  function getAIPriorityLevel(predictedScore) {
    if (predictedScore > 85) return { level: 'CRITICAL', color: '#dc2626', emoji: '🔴', symbol: '●' };
    if (predictedScore > 70) return { level: 'High', color: '#ea580c', emoji: '🟠', symbol: '●' };
    if (predictedScore > 40) return { level: 'Medium', color: '#eab308', emoji: '🟡', symbol: '●' };
    return { level: 'Low', color: '#16a34a', emoji: '🟢', symbol: '●' };
  }

  function getBorderColor(predictedScore) {
    if (predictedScore > 85) return '#dc2626';  // Critical - bright red
    if (predictedScore > 70) return '#ea580c';  // High - orange
    if (predictedScore > 40) return '#eab308';  // Medium - yellow
    return '#16a34a';  // Low - green
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Filter reports using predicted_risk_score
  const filtered = reports.filter(r => {
    let riskPass = true;
    const score = r.predicted_risk_score || r.risk_score || 0;
    if (riskFilter === 'high') riskPass = score >= 70;
    if (riskFilter === 'medium') riskPass = score >= 40 && score < 70;
    if (riskFilter === 'low') riskPass = score < 40;

    let statusPass = statusFilter === 'all' || r.status === statusFilter;

    return riskPass && statusPass;
  });

  // Get top 5 priority cases sorted by predicted_risk_score
  const topPriority = [...filtered]
    .filter(r => r.status !== 'resolved')
    .sort((a, b) => (b.predicted_risk_score || 0) - (a.predicted_risk_score || 0))
    .slice(0, 5);

  return (
    <div className="police-dashboard">
      <header className="police-header">
        <div>
          <h1>👮 AI-Powered Police Dashboard</h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Real-time incident management with AI risk prediction</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span>{user?.name} (Police)</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Dashboard Navigation */}
      <div className="dashboard-nav">
        <Link to="#" className="nav-link active">📋 Incident Management</Link>
        <Link to="/police/analytics" className="nav-link">📊 Analytics</Link>
        <Link to="/police/heatmap" className="nav-link">🗺️ Heatmap</Link>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={fetchReports} style={{ marginLeft: '10px' }}>Retry</button>
        </div>
      )}

      {/* Smart Alert Automation - Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="critical-alerts">
          <div className="alert-header">
            <span className="alert-icon">🚨</span>
            <span className="alert-text">
              <strong>CRITICAL ALERT! {criticalAlerts.length} case{criticalAlerts.length !== 1 ? 's' : ''} require immediate attention</strong>
            </span>
          </div>
          <div className="critical-cases">
            {criticalAlerts.map((alert, idx) => (
              <div key={alert.id} className="critical-case-item">
                <div className="critical-rank">#{idx + 1}</div>
                <div className="critical-info">
                  <div className="critical-type">{alert.type.toUpperCase()}</div>
                  <div className="critical-time">
                    ⏱️ {alert.hoursUnresolved > 0 
                      ? `${alert.hoursUnresolved}h ${alert.minutesUnresolved % 60}m ago`
                      : `${alert.minutesUnresolved}m ago`
                    }
                  </div>
                </div>
                <div className="critical-score">{alert.predicted_risk_score}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="police-controls">
        <div className="filter-group">
          <label>Risk Level (AI):</label>
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
            <option value="all">All Reports</option>
            <option value="high">🔴 High (≥70)</option>
            <option value="medium">🟡 Medium (40-70)</option>
            <option value="low">🟢 Low (under 40)</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">⏳ Pending</option>
            <option value="investigating">🔍 Investigating</option>
            <option value="resolved">✅ Resolved</option>
          </select>
        </div>
        <button className="btn-refresh" onClick={fetchReports} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {topPriority.length > 0 && (
        <div className="priority-panel">
          <h2>🎯 AI Priority Queue (Top {Math.min(5, topPriority.length)})</h2>
          <div className="priority-list">
            {topPriority.map((report, idx) => {
              const priority = getAIPriorityLevel(report.predicted_risk_score);
              const isOld = report.hoursUnresolved >= 2;
              
              return (
                <div 
                  key={report.id} 
                  className="priority-item" 
                  style={{ 
                    borderLeftColor: priority.color,
                    backgroundColor: report.predicted_risk_score > 85 ? '#fef2f2' : '#f5f5f5'
                  }}
                >
                  <div className="priority-rank">#{idx + 1}</div>
                  <div className="priority-info">
                    <div className="priority-title">
                      <span className="type-badge">{priority.emoji} {report.type.toUpperCase()}</span>
                      <span className="ai-priority-badge" style={{ backgroundColor: priority.color }}>
                        {priority.level}
                      </span>
                    </div>
                    <div className="priority-details">
                      <span className="ai-score">AI Score: {report.predicted_risk_score}</span>
                      <span className="confidence">Confidence: {(report.ai_confidence * 100).toFixed(0)}%</span>
                      <span className="time-elapsed">
                        {isOld && '⏰ '}
                        {report.hoursUnresolved > 0 
                          ? `${report.hoursUnresolved}h${report.minutesUnresolved % 60 > 0 ? ` ${report.minutesUnresolved % 60}m` : ''} ago`
                          : `${report.minutesUnresolved}m ago`
                        }
                      </span>
                    </div>
                    {report.aiPriorityLevel && (
                      <div className="ai-explanation">
                        <em>{report.aiPriorityLevel}</em>
                      </div>
                    )}
                  </div>
                  <div className="priority-reporter">
                    <strong>{report.name}</strong><br />
                    <small>{report.email}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-panel">Loading reports...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-panel">
          <p>No reports found for this filter</p>
        </div>
      ) : (
        <div className="reports-section">
          <h2>📋 All Reports ({filtered.length})</h2>
          <div className="reports-grid">
            {filtered.map(report => {
              const priority = getAIPriorityLevel(report.predicted_risk_score);
              const borderColor = getBorderColor(report.predicted_risk_score);
              const isCritical = report.predicted_risk_score > 85;
              
              return (
                <div 
                  key={report.id} 
                  className={`report-item ${isCritical ? 'critical-report' : ''}`}
                  style={{ borderLeftColor: borderColor }}
                >
                  <div className="report-header-row">
                    <div>
                      <h3>{report.type.toUpperCase()}</h3>
                      <div className="risk-badges">
                        <span 
                          className="ai-priority-badge"
                          style={{ backgroundColor: priority.color }}
                        >
                          {priority.emoji} {priority.level}
                        </span>
                        <span className="ai-score-badge">
                          AI: {report.predicted_risk_score}
                        </span>
                        <span className="confidence-badge">
                          {(report.ai_confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <span className={`status-badge status-${report.status}`}>
                      {report.status}
                    </span>
                  </div>

                  <div className="report-info">
                    <p><strong>Reporter:</strong> {report.name || 'Unknown'}</p>
                    <p><strong>Email:</strong> {report.email || 'N/A'}</p>
                  </div>

                  <div className="report-description">
                    <p>{report.description}</p>
                  </div>

                  {report.latitude && report.longitude && (
                    <p className="report-location">
                      📍 {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                    </p>
                  )}

                  <p className="report-time">
                    📅 {new Date(report.timestamp).toLocaleString()}
                  </p>

                  <div className="action-buttons">
                    {report.status !== 'investigating' && (
                      <button 
                        className="btn-action btn-investigating"
                        onClick={() => updateReportStatus(report.id, 'investigating')}
                      >
                        🔍 Investigate
                      </button>
                    )}
                    {report.status !== 'resolved' && (
                      <button 
                        className="btn-action btn-resolved"
                        onClick={() => updateReportStatus(report.id, 'resolved')}
                      >
                        ✅ Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .police-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          padding: 20px;
        }

        .police-header {
          background: white;
          padding: 20px;
          borderRadius: 8px;
          marginBottom: 12px;
          display: flex;
          justifyContent: space-between;
          alignItems: center;
          boxShadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .police-header h1 {
          margin: 0;
          color: #1e3c72;
          fontSize: 1.5em;
        }

        .police-header p {
          margin: 4px 0 0 0;
        }

        .dashboard-nav {
          background: white;
          padding: 8px 20px;
          borderRadius: 6px;
          marginBottom: 20px;
          display: flex;
          gap: 20px;
          boxShadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .nav-link {
          color: #666;
          text-decoration: none;
          padding: 10px 0;
          border-bottom: 3px solid transparent;
          font-weight: 500;
          transition: all 0.3s;
        }

        .nav-link:hover {
          color: #1e3c72;
          border-bottom-color: #1e3c72;
        }

        .nav-link.active {
          color: #1e3c72;
          border-bottom-color: #1e3c72;
        }

        .btn-logout {
          padding: 8px 16px;
          background: #ff5722;
          color: white;
          border: none;
          borderRadius: 4px;
          cursor: pointer;
          fontWeight: bold;
          transition: all 0.3s;
        }

        .btn-logout:hover {
          background: #e64a19;
        }

        .critical-alerts {
          background: #fef2f2;
          border: 2px solid #dc2626;
          borderRadius: 6px;
          marginBottom: 20px;
          overflow: hidden;
        }

        .alert-header {
          background: #dc2626;
          color: white;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.1em;
          animation: pulse 1s infinite;
        }

        .alert-icon {
          font-size: 1.5em;
          animation: bounce 0.8s infinite;
        }

        .critical-cases {
          padding: 12px 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .critical-case-item {
          background: white;
          border: 1px solid #dc2626;
          borderRadius: 4px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 1 auto;
        }

        .critical-rank {
          font-weight: bold;
          color: #dc2626;
        }

        .critical-info {
          flex: 1;
        }

        .critical-type {
          font-weight: bold;
          font-size: 0.9em;
        }

        .critical-time {
          font-size: 0.85em;
          color: #666;
        }

        .critical-score {
          background: #dc2626;
          color: white;
          padding: 4px 8px;
          borderRadius: 3px;
          font-weight: bold;
          font-size: 0.9em;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .error-banner {
          background: #ffcdd2;
          color: #c62828;
          padding: 12px;
          borderRadius: 4px;
          marginBottom: 20px;
          border: 1px solid #ef5350;
          display: flex;
          alignItems: center;
          justifyContent: space-between;
        }

        .error-banner button {
          padding: 4px 12px;
          background: white;
          border: 1px solid #c62828;
          borderRadius: 3px;
          cursor: pointer;
          color: #c62828;
          fontWeight: bold;
        }

        .police-controls {
          background: white;
          padding: 15px;
          borderRadius: 8px;
          marginBottom: 20px;
          display: flex;
          gap: 15px;
          alignItems: center;
          boxShadow: 0 2px 8px rgba(0,0,0,0.1);
          flexWrap: wrap;
        }

        .filter-group {
          display: flex;
          gap: 10px;
          alignItems: center;
        }

        .filter-group label {
          fontWeight: bold;
          color: #333;
        }

        .filter-group select {
          padding: 8px 12px;
          borderRadius: 4px;
          border: 1px solid #ddd;
          backgroundColor: white;
          cursor: pointer;
          fontSize: 1em;
        }

        .btn-refresh {
          padding: 8px 16px;
          background: #2196F3;
          color: white;
          border: none;
          borderRadius: 4px;
          cursor: pointer;
          fontWeight: bold;
          transition: all 0.3s;
        }

        .btn-refresh:hover:not(:disabled) {
          background: #1976D2;
        }

        .btn-refresh:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .priority-panel {
          background: white;
          padding: 20px;
          borderRadius: 8px;
          marginBottom: 20px;
          boxShadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .priority-panel h2 {
          margin: 0 0 15px 0;
          color: #1e3c72;
          fontSize: 1.3em;
        }

        .priority-list {
          display: flex;
          flexDirection: column;
          gap: 10px;
        }

        .priority-item {
          background: #f5f5f5;
          border-left: 4px solid #ff9800;
          padding: 15px;
          borderRadius: 4px;
          display: flex;
          gap: 15px;
          alignItems: center;
        }

        .priority-rank {
          fontSize: 1.5em;
          fontWeight: bold;
          color: #666;
          minWidth: 40px;
        }

        .priority-info {
          flex: 1;
        }

        .priority-title {
          fontSize: 1.1em;
          fontWeight: bold;
          color: #333;
          display: flex;
          gap: 10px;
          alignItems: center;
          marginBottom: 5px;
        }

        .priority-details {
          display: flex;
          gap: 15px;
          fontSize: 0.95em;
          color: #666;
          flexWrap: wrap;
        }

        .ai-score {
          fontWeight: bold;
          color: #1e3c72;
        }

        .confidence {
          color: #666;
        }

        .time-elapsed {
          color: #999;
        }

        .ai-explanation {
          marginTop: 6px;
          padding: 6px 8px;
          backgroundColor: #e3f2fd;
          borderLeft: 2px solid #2196F3;
          borderRadius: 2px;
          fontSize: 0.9em;
          color: #0d47a1;
        }

        .priority-reporter {
          textAlign: right;
          fontSize: 0.9em;
          minWidth: 150px;
        }

        .ai-priority-badge {
          padding: 4px 12px;
          borderRadius: 20px;
          fontSize: 0.85em;
          fontWeight: bold;
          color: white;
        }

        .ai-score-badge {
          background: #e0e0e0;
          color: #333;
          padding: 4px 12px;
          borderRadius: 20px;
          fontSize: 0.85em;
          fontWeight: bold;
        }

        .confidence-badge {
          background: #c8e6c9;
          color: #1b5e20;
          padding: 4px 12px;
          borderRadius: 20px;
          fontSize: 0.85em;
          fontWeight: bold;
        }

        .loading-panel, .empty-panel {
          background: white;
          padding: 40px;
          borderRadius: 8px;
          textAlign: center;
          color: #666;
          boxShadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .reports-section {
          background: white;
          padding: 20px;
          borderRadius: 8px;
          boxShadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .reports-section h2 {
          margin: 0 0 20px 0;
          color: #1e3c72;
        }

        .reports-grid {
          display: grid;
          gridTemplateColumns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .report-item {
          background: #f9f9f9;
          borderRadius: 8px;
          padding: 16px;
          border-left: 4px solid #667eea;
          transition: all 0.3s;
        }

        .report-item.critical-report {
          background: #fef2f2;
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.3);
        }

        .report-item:hover {
          boxShadow: 0 4px 16px rgba(0,0,0,0.15);
          transform: translateY(-2px);
        }

        .report-header-row {
          display: flex;
          justifyContent: space-between;
          alignItems: flex-start;
          marginBottom: 12px;
          paddingBottom: 12px;
          borderBottom: 2px solid #f0f0f0;
        }

        .report-header-row h3 {
          margin: 0;
          color: #1e3c72;
          fontSize: 1.1em;
        }

        .risk-badges {
          display: flex;
          gap: 8px;
          marginTop: 8px;
          flexWrap: wrap;
        }

        .status-badge {
          padding: 4px 12px;
          borderRadius: 20px;
          fontSize: 0.85em;
          fontWeight: bold;
          textTransform: uppercase;
        }

        .status-pending {
          backgroundColor: #fff3cd;
          color: #856404;
        }

        .status-investigating {
          backgroundColor: #cfe2ff;
          color: #084298;
        }

        .status-resolved {
          backgroundColor: #d1e7dd;
          color: #0f5132;
        }

        .report-info {
          margin: 12px 0;
          fontSize: 0.95em;
        }

        .report-info p {
          margin: 5px 0;
          color: #555;
        }

        .report-description {
          background: #fff;
          padding: 12px;
          borderRadius: 4px;
          margin: 12px 0;
          borderLeft: 3px solid #2196F3;
        }

        .report-description p {
          margin: 0;
          color: #333;
          lineHeight: 1.5;
        }

        .report-location {
          color: #666;
          fontSize: 0.95em;
          margin: 8px 0;
          fontWeight: 500;
        }

        .report-time {
          color: #999;
          fontSize: 0.9em;
          margin: 8px 0;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
          marginTop: 12px;
          flexWrap: wrap;
        }

        .btn-action {
          flex: 1;
          padding: 8px 12px;
          border: none;
          borderRadius: 4px;
          cursor: pointer;
          fontWeight: bold;
          fontSize: 0.9em;
          transition: all 0.3s;
          minWidth: 120px;
        }

        .btn-investigating {
          background: #2196F3;
          color: white;
        }

        .btn-investigating:hover {
          background: #1976D2;
        }

        .btn-resolved {
          background: #4CAF50;
          color: white;
        }

        .btn-resolved:hover {
          background: #388E3C;
        }

        .type-badge {
          padding: 2px 8px;
          backgroundColor: #f0f0f0;
          borderRadius: 3px;
          fontSize: 0.95em;
        }
      `}</style>
    </div>
  );
}

export default PoliceDashboard;
