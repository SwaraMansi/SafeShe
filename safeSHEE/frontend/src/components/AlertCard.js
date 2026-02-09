import React from 'react';
import RiskMeter from './RiskMeter';

// Calculate a simple risk score (0-100) based on various factors.
function calculateRisk(alert){
  let score = 50; // baseline
  
  // Time of day factor (late night = higher)
  const hour = new Date(alert.timestamp).getHours();
  if (hour >= 22 || hour <= 5) score += 30; // late night
  else if (hour >= 18 || hour <= 7) score += 15; // evening/early morning
  
  // Status factor
  if (alert.status === 'active') score += 20;
  
  return Math.min(100, score);
}

// AlertCard shows alert details, risk, timestamp and action buttons.
function AlertCard({ alert, onRespond, onResolve }){
  const risk = calculateRisk(alert);
  
  return (
    <div className={`alert-card ${alert.status}`}>
      <div className="alert-top">
        <div>
          <strong>{alert.name || 'Unknown'}</strong>
          <div className="small">{alert.email || 'N/A'} • {new Date(alert.timestamp).toLocaleString()}</div>
          <div className="small">Location: {alert.latitude ? alert.latitude.toFixed(4) : 'N/A'}, {alert.longitude ? alert.longitude.toFixed(4) : 'N/A'}</div>
          <div className="small">Status: <strong>{alert.status}</strong></div>
        </div>
        <div className="alert-actions">
          {alert.status !== 'responding' && alert.status !== 'resolved' && (
            <button className="btn-secondary" onClick={()=>onRespond(alert.id)}>Responding</button>
          )}
          {alert.status !== 'resolved' && (
            <button className="btn-secondary" onClick={()=>onResolve(alert.id)}>Resolve</button>
          )}
        </div>
      </div>
      <div style={{marginTop:8}}>
        <RiskMeter score={risk} />
      </div>
    </div>
  );
}

export default AlertCard;
