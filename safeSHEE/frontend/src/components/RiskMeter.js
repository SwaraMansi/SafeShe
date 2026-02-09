import React from 'react';

// Simple RiskMeter component that displays a horizontal meter and a color badge.
// Accepts `score` (0-100).
function RiskMeter({ score=0 }){
  const color = score > 70 ? '#ff4d4f' : (score > 40 ? '#ffbb00' : '#4cd964');
  return (
    <div className="risk-meter">
      <div className="risk-row">
        <div className="risk-badge" style={{background:color}}>{score}</div>
        <div className="risk-bar">
          <div className="risk-fill" style={{width:`${score}%`, background:color}} />
        </div>
      </div>
      {score > 70 && <div className="high-alert">HIGH RISK ALERT</div>}
    </div>
  );
}

export default RiskMeter;
