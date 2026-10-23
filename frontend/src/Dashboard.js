import api from "./api";
import { useEffect, useState } from "react";

const demoReports = [
  { _id: "demo-1", category: "stalking", riskScore: 8, description: "Repeated unwanted following reported near the transit station.", location: { lat: 19.076, lng: 72.878 }, createdAt: new Date(Date.now() - 18 * 60000).toISOString(), status: "active" },
  { _id: "demo-2", category: "harassment", riskScore: 5, description: "Verbal harassment reported outside a residential building.", location: null, createdAt: new Date(Date.now() - 52 * 60000).toISOString(), status: "active" },
  { _id: "demo-3", category: "sos", riskScore: 10, description: "SOS emergency alert activated by a user.", location: { lat: 19.089, lng: 72.865 }, createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), status: "resolved" }
];

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get('/api/report');
        setReports(Array.isArray(res) ? res : res.data || []);
        setError('');
        setDemoMode(false);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
        setReports(demoReports);
        setError('');
        setDemoMode(true);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, []);

  const getRiskBadgeClass = (score) => {
    if (!score) return 'risk-low';
    const numScore = typeof score === 'string' ? parseInt(score) : score;
    if (numScore >= 7) return 'risk-high';
    if (numScore >= 4) return 'risk-medium';
    return 'risk-low';
  };

  const getRiskLabel = (score) => {
    if (!score) return 'Low';
    const numScore = typeof score === 'string' ? parseInt(score) : score;
    if (numScore >= 7) return '🔴 High';
    if (numScore >= 4) return '🟡 Medium';
    return '🟢 Low';
  };

  const getStatusIcon = (category) => {
    const icons = {
      'harassment': '🚫',
      'assault': '⚠️',
      'stalking': '👁️',
      'threat': '💬',
      'theft': '🎒',
      'sos': '🚨',
      'other': '📝'
    };
    return icons[category] || '📋';
  };

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => r.category === filter || (filter === 'sos' && r.description?.includes('SOS')));

  const stats = {
    total: reports.length,
    high_risk: reports.filter(r => {
      const score = typeof r.riskScore === 'string' ? parseInt(r.riskScore) : r.riskScore;
      return score >= 7;
    }).length,
    active: reports.filter(r => r.status === 'active').length
  };

  return (
    <div className="card dashboard-card">
      <div className="section-heading">
        <div><p className="eyebrow">Response centre</p><h2>Live incident dashboard</h2></div>
        <span className={`live-badge ${demoMode ? "demo-badge" : ""}`}><span className="status-dot" /> {demoMode ? "Preview data" : "Live"}</span>
      </div>

      {/* Stats Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total Reports</p>
        </div>
        <div className="stat-card">
          <h3>{stats.high_risk}</h3>
          <p>High Risk Incidents</p>
        </div>
        <div className="stat-card">
          <h3>{stats.active}</h3>
          <p>Active Cases</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-bar" aria-label="Filter incidents">
        <button
          onClick={() => setFilter('all')}
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
        >
          All Incidents
        </button>
        {['harassment', 'assault', 'stalking', 'threat', 'theft', 'sos'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`filter-button ${filter === cat ? 'active' : ''}`}
          >
            {getStatusIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Table Section */}
      <div className="dashboard-container">
        {loading ? (
          <div className="empty-state"><span className="loading-spinner" /><p>Loading incident data...</p></div>
        ) : error ? (
          <div className="empty-state error-state"><p>{error}</p></div>
        ) : filteredReports.length === 0 ? (
          <div className="empty-state"><span className="empty-icon" aria-hidden="true">✓</span><p>No incidents match this filter.</p></div>
        ) : (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Risk Level</th>
                <th>Description</th>
                <th>Location</th>
                <th>Reported</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report._id || `${report.createdAt}-${report.description}`}>
                  <td>
                    <span className="incident-icon" aria-hidden="true">
                      {getStatusIcon(report.category)}
                    </span>
                    {report.category ? report.category.charAt(0).toUpperCase() + report.category.slice(1) : 'Other'}
                  </td>
                  <td>
                    <span className={`risk-badge ${getRiskBadgeClass(report.riskScore)}`}>
                      {getRiskLabel(report.riskScore)} ({report.riskScore || 0})
                    </span>
                  </td>
                  <td className="description-cell">
                    {report.description?.substring(0, 60)}
                    {report.description?.length > 60 ? '...' : ''}
                  </td>
                  <td className="location-cell">
                    {report.location ? (
                      <span title={`${report.location.lat}, ${report.location.lng}`}>
                        {report.location.lat?.toFixed(3)}, {report.location.lng?.toFixed(3)}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>Not provided</span>
                    )}
                  </td>
                  <td className="date-cell">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`case-status status-${(report.status || 'active').toLowerCase()}`}>
                      {report.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="dashboard-footer">
        <p>
          Auto-refreshes every 10 seconds <span aria-hidden="true">·</span> Showing {filteredReports.length} of {reports.length} incidents
        </p>
      </div>
    </div>
  );
}
