import React, { useEffect, useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const API = process.env.REACT_APP_API || "http://localhost:5000";

function PoliceDashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [criticalAlerts, setCriticalAlerts] = useState([]);

  // ✅ STEP 4 FIX — user change hone pe purana data clear hoga
  useEffect(() => {
    setReports([]);
    setCriticalAlerts([]);
    setError(null);

    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "police") {
      navigate("/user");
      return;
    }
    fetchReports();
    const interval = setInterval(fetchReports, 15000);
    initializeWebSocket();
    return () => clearInterval(interval);
  }, [user, token, navigate]);

  function initializeWebSocket() {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.hostname}:5000`);
      ws.onopen = () => console.log("✅ WebSocket connected");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_alert" || data.type === "alert_update")
            fetchReports();
        } catch (err) {
          console.error("WebSocket parse error:", err);
        }
      };
      ws.onerror = (err) => console.error("WebSocket error:", err);
      ws.onclose = () => setTimeout(initializeWebSocket, 5000);
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
    }
  }

  async function fetchReports() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setError("Unauthorized: Invalid token");
        return;
      }
      if (!res.ok) {
        setError(`Error: ${res.statusText}`);
        return;
      }
      const data = await res.json();
      const reportsData = data.reports || [];
      setReports(reportsData);
      const critical = reportsData.filter(
        (r) => r.predicted_risk_score > 85 && r.status !== "resolved",
      );
      setCriticalAlerts(critical);
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function updateReportStatus(reportId, newStatus) {
    try {
      const res = await fetch(`${API}/reports/${reportId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)),
      );
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  }

  function getAIPriorityLevel(predictedScore) {
    if (predictedScore > 85)
      return { level: "CRITICAL", color: "#dc2626", emoji: "🔴" };
    if (predictedScore > 70)
      return { level: "High", color: "#ea580c", emoji: "🟠" };
    if (predictedScore > 40)
      return { level: "Medium", color: "#eab308", emoji: "🟡" };
    return { level: "Low", color: "#16a34a", emoji: "🟢" };
  }

  function getBorderColor(predictedScore) {
    if (predictedScore > 85) return "#dc2626";
    if (predictedScore > 70) return "#ea580c";
    if (predictedScore > 40) return "#eab308";
    return "#16a34a";
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Filter + Search
  const filtered = reports.filter((r) => {
    const score = r.predicted_risk_score || r.risk_score || 0;
    let riskPass = true;
    if (riskFilter === "high") riskPass = score >= 70;
    if (riskFilter === "medium") riskPass = score >= 40 && score < 70;
    if (riskFilter === "low") riskPass = score < 40;

    let statusPass = statusFilter === "all" || r.status === statusFilter;

    let searchPass = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      searchPass =
        (r.type || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.name || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q);
    }

    return riskPass && statusPass && searchPass;
  });

  const topPriority = [...filtered]
    .filter((r) => r.status !== "resolved")
    .sort(
      (a, b) => (b.predicted_risk_score || 0) - (a.predicted_risk_score || 0),
    )
    .slice(0, 5);

  return (
    <div className="police-dashboard">
      <header className="police-header">
        <div>
          <h1>👮 AI-Powered Police Dashboard</h1>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            Real-time incident management with AI risk prediction
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span>{user?.name} (Police)</span>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-nav">
        <Link to="#" className="nav-link active">
          📋 Incident Management
        </Link>
        <Link to="/police/analytics" className="nav-link">
          📊 Analytics
        </Link>
        <Link to="/police/heatmap" className="nav-link">
          🗺️ Heatmap
        </Link>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={fetchReports} style={{ marginLeft: "10px" }}>
            Retry
          </button>
        </div>
      )}

      {criticalAlerts.length > 0 && (
        <div className="critical-alerts">
          <div className="alert-header">
            <span className="alert-icon">🚨</span>
            <strong>
              CRITICAL ALERT! {criticalAlerts.length} case
              {criticalAlerts.length !== 1 ? "s" : ""} require immediate
              attention
            </strong>
          </div>
          <div className="critical-cases">
            {criticalAlerts.map((alert, idx) => (
              <div key={alert.id} className="critical-case-item">
                <div className="critical-rank">#{idx + 1}</div>
                <div className="critical-info">
                  <div className="critical-type">
                    {alert.type.toUpperCase()}
                  </div>
                  <div className="critical-time">
                    ⏱️{" "}
                    {alert.hoursUnresolved > 0
                      ? `${alert.hoursUnresolved}h ago`
                      : `${alert.minutesUnresolved}m ago`}
                  </div>
                </div>
                <div className="critical-score">
                  {alert.predicted_risk_score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls + Search */}
      <div className="police-controls">
        <div className="search-group">
          <span style={{ fontSize: "16px" }}>🔍</span>
          <input
            type="text"
            placeholder="Search by type, description, reporter name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="clear-btn">
              ✕
            </button>
          )}
        </div>

        <div className="filter-group">
          <label>Risk Level:</label>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="all">All Reports</option>
            <option value="high">🔴 High (≥70)</option>
            <option value="medium">🟡 Medium (40-70)</option>
            <option value="low">🟢 Low (under 40)</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">⏳ Pending</option>
            <option value="investigating">🔍 Investigating</option>
            <option value="resolved">✅ Resolved</option>
          </select>
        </div>

        <button
          className="btn-refresh"
          onClick={fetchReports}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {topPriority.length > 0 && (
        <div className="priority-panel">
          <h2>🎯 AI Priority Queue (Top {Math.min(5, topPriority.length)})</h2>
          <div className="priority-list">
            {topPriority.map((report, idx) => {
              const priority = getAIPriorityLevel(report.predicted_risk_score);
              return (
                <div
                  key={report.id}
                  className="priority-item"
                  style={{
                    borderLeftColor: priority.color,
                    backgroundColor:
                      report.predicted_risk_score > 85 ? "#fef2f2" : "#f5f5f5",
                  }}
                >
                  <div className="priority-rank">#{idx + 1}</div>
                  <div className="priority-info">
                    <div className="priority-title">
                      <span className="type-badge">
                        {priority.emoji} {report.type.toUpperCase()}
                      </span>
                      <span
                        className="ai-priority-badge"
                        style={{ backgroundColor: priority.color }}
                      >
                        {priority.level}
                      </span>
                    </div>
                    <div className="priority-details">
                      <span className="ai-score">
                        AI Score: {report.predicted_risk_score}
                      </span>
                      <span className="confidence">
                        Confidence: {(report.ai_confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="priority-reporter">
                    <strong>{report.name}</strong>
                    <br />
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
          <p>
            {searchQuery
              ? `No results for "${searchQuery}"`
              : "No reports found for this filter"}
          </p>
        </div>
      ) : (
        <div className="reports-section">
          <h2>📋 All Reports ({filtered.length})</h2>
          <div className="reports-grid">
            {filtered.map((report) => {
              const priority = getAIPriorityLevel(report.predicted_risk_score);
              const borderColor = getBorderColor(report.predicted_risk_score);
              const isCritical = report.predicted_risk_score > 85;

              return (
                <div
                  key={report.id}
                  className={`report-item ${isCritical ? "critical-report" : ""}`}
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
                      {report.status === "pending" && "⏳ Pending"}
                      {report.status === "investigating" && "🔍 Investigating"}
                      {report.status === "resolved" && "✅ Resolved"}
                    </span>
                  </div>

                  <div className="report-info">
                    <p>
                      <strong>Reporter:</strong> {report.name || "Unknown"}
                    </p>
                    <p>
                      <strong>Email:</strong> {report.email || "N/A"}
                    </p>
                  </div>

                  <div className="report-description">
                    <p>{report.description}</p>
                  </div>

                  {report.latitude && report.longitude && (
                    <p className="report-location">
                      📍 {report.latitude.toFixed(4)},{" "}
                      {report.longitude.toFixed(4)}
                    </p>
                  )}

                  <p className="report-time">
                    📅 {new Date(report.timestamp).toLocaleString()}
                  </p>

                  <div className="action-buttons">
                    {report.status === "pending" && (
                      <>
                        <button
                          className="btn-action btn-investigating"
                          onClick={() =>
                            updateReportStatus(report.id, "investigating")
                          }
                        >
                          🔍 Investigate
                        </button>
                        <button
                          className="btn-action btn-resolved"
                          onClick={() =>
                            updateReportStatus(report.id, "resolved")
                          }
                        >
                          ✅ Mark Resolved
                        </button>
                      </>
                    )}
                    {report.status === "investigating" && (
                      <button
                        className="btn-action btn-resolved"
                        onClick={() =>
                          updateReportStatus(report.id, "resolved")
                        }
                      >
                        ✅ Mark Resolved
                      </button>
                    )}
                    {report.status === "resolved" && (
                      <div className="resolved-label">✅ Case Closed</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .police-dashboard { min-height: 100vh; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 20px; }
        .police-header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .police-header h1 { margin: 0; color: #1e3c72; font-size: 1.5em; }
        .dashboard-nav { background: white; padding: 8px 20px; border-radius: 6px; margin-bottom: 20px; display: flex; gap: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .nav-link { color: #666; text-decoration: none; padding: 10px 0; border-bottom: 3px solid transparent; font-weight: 500; transition: all 0.3s; }
        .nav-link:hover, .nav-link.active { color: #1e3c72; border-bottom-color: #1e3c72; }
        .btn-logout { padding: 8px 16px; background: #ff5722; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .btn-logout:hover { background: #e64a19; }

        .critical-alerts { background: #fef2f2; border: 2px solid #dc2626; border-radius: 6px; margin-bottom: 20px; overflow: hidden; }
        .alert-header { background: #dc2626; color: white; padding: 12px 16px; display: flex; align-items: center; gap: 12px; font-size: 1.1em; animation: pulse 1s infinite; }
        .alert-icon { font-size: 1.5em; animation: bounce 0.8s infinite; }
        .critical-cases { padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 10px; }
        .critical-case-item { background: white; border: 1px solid #dc2626; border-radius: 4px; padding: 8px 12px; display: flex; align-items: center; gap: 8px; }
        .critical-rank { font-weight: bold; color: #dc2626; }
        .critical-type { font-weight: bold; font-size: 0.9em; }
        .critical-time { font-size: 0.85em; color: #666; }
        .critical-score { background: #dc2626; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold; font-size: 0.9em; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

        .error-banner { background: #ffcdd2; color: #c62828; padding: 12px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #ef5350; display: flex; align-items: center; justify-content: space-between; }

        .police-controls { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 15px; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); flex-wrap: wrap; }
        .search-group { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 250px; background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 12px; }
        .search-input { border: none; background: transparent; outline: none; font-size: 0.95em; width: 100%; color: #333; }
        .clear-btn { background: none; border: none; cursor: pointer; color: #999; font-size: 14px; padding: 0; }
        .clear-btn:hover { color: #333; }
        .filter-group { display: flex; gap: 8px; align-items: center; }
        .filter-group label { font-weight: bold; color: #333; white-space: nowrap; }
        .filter-group select { padding: 8px 12px; border-radius: 4px; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 0.95em; }
        .btn-refresh { padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .btn-refresh:hover:not(:disabled) { background: #1976D2; }
        .btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

        .priority-panel { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .priority-panel h2 { margin: 0 0 15px 0; color: #1e3c72; font-size: 1.3em; }
        .priority-list { display: flex; flex-direction: column; gap: 10px; }
        .priority-item { background: #f5f5f5; border-left: 4px solid #ff9800; padding: 15px; border-radius: 4px; display: flex; gap: 15px; align-items: center; }
        .priority-rank { font-size: 1.5em; font-weight: bold; color: #666; min-width: 40px; }
        .priority-info { flex: 1; }
        .priority-title { font-size: 1.1em; font-weight: bold; color: #333; display: flex; gap: 10px; align-items: center; margin-bottom: 5px; }
        .priority-details { display: flex; gap: 15px; font-size: 0.95em; color: #666; }
        .ai-score { font-weight: bold; color: #1e3c72; }
        .priority-reporter { text-align: right; font-size: 0.9em; min-width: 150px; }

        .loading-panel, .empty-panel { background: white; padding: 40px; border-radius: 8px; text-align: center; color: #666; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .reports-section { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .reports-section h2 { margin: 0 0 20px 0; color: #1e3c72; }
        .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }

        .report-item { background: #f9f9f9; border-radius: 8px; padding: 16px; border-left: 4px solid #667eea; transition: all 0.3s; }
        .report-item.critical-report { background: #fef2f2; box-shadow: 0 0 10px rgba(220,38,38,0.3); }
        .report-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.15); transform: translateY(-2px); }

        .report-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 2px solid #f0f0f0; }
        .report-header-row h3 { margin: 0; color: #1e3c72; font-size: 1.1em; }
        .risk-badges { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }

        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; white-space: nowrap; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-investigating { background: #cfe2ff; color: #084298; }
        .status-resolved { background: #d1e7dd; color: #0f5132; }

        .ai-priority-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; color: white; }
        .ai-score-badge { background: #e0e0e0; color: #333; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }
        .confidence-badge { background: #c8e6c9; color: #1b5e20; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: bold; }

        .report-info { margin: 12px 0; font-size: 0.95em; }
        .report-info p { margin: 5px 0; color: #555; }
        .report-description { background: #fff; padding: 12px; border-radius: 4px; margin: 12px 0; border-left: 3px solid #2196F3; }
        .report-description p { margin: 0; color: #333; line-height: 1.5; }
        .report-location { color: #666; font-size: 0.95em; margin: 8px 0; font-weight: 500; }
        .report-time { color: #999; font-size: 0.9em; margin: 8px 0; }

        .action-buttons { display: flex; gap: 10px; margin-top: 12px; }
        .btn-action { flex: 1; padding: 9px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9em; transition: all 0.3s; }
        .btn-investigating { background: #2196F3; color: white; }
        .btn-investigating:hover { background: #1976D2; }
        .btn-resolved { background: #4CAF50; color: white; }
        .btn-resolved:hover { background: #388E3C; }
        .resolved-label { width: 100%; text-align: center; padding: 8px; background: #d1e7dd; color: #0f5132; border-radius: 6px; font-weight: bold; font-size: 0.9em; }

        .type-badge { padding: 2px 8px; background: #f0f0f0; border-radius: 3px; font-size: 0.95em; }
      `}</style>
    </div>
  );
}

export default PoliceDashboard;
