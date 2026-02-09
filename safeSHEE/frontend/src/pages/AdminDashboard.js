import React, { useState } from 'react';
import LiveMap from '../components/LiveMap';

// AdminDashboard uses mock data (frontend-only) and allows marking alerts resolved locally.
const MOCK_ALERTS = [
  { id:1, name:'Alice', email:'alice@example.com', latitude:28.7041, longitude:77.1025, timestamp: Date.now() - 60000, status:'active' },
  { id:2, name:'Bob', email:'bob@example.com', latitude:19.0760, longitude:72.8777, timestamp: Date.now() - 120000, status:'active' }
];

function AdminDashboard(){
  const [alerts, setAlerts] = useState(MOCK_ALERTS);

  function resolve(id){
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status:'resolved' } : a));
  }

  return (
    <div className="admin-page">
      <h2>Admin Dashboard</h2>
      <div className="admin-grid">
        <div className="map-panel">
          <LiveMap alerts={alerts.filter(a=>a.status==='active')} />
        </div>
        <div className="panel">
          <h3>All Alerts</h3>
          <ul className="alerts-list">
            {alerts.map(a=> (
              <li key={a.id} className={`alert-row ${a.status==='resolved' ? 'resolved' : ''}`}>
                <div>
                  <strong>{a.name}</strong>
                  <div className="small">{a.email} • {new Date(a.timestamp).toLocaleString()}</div>
                  <div className="small">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</div>
                </div>
                <div>
                  <button className="btn-secondary" onClick={()=>resolve(a.id)} disabled={a.status==='resolved'}>{a.status==='resolved' ? 'Resolved' : 'Mark Resolved'}</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
