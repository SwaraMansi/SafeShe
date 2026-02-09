import React, { useState, useEffect, useContext } from 'react';
import SOSButton from '../components/SOSButton';
import LiveMap from '../components/LiveMap';
import { AuthContext } from '../context/AuthContext';

// Dashboard shows SOS controls and live map. Uses mocked behavior (no backend).
function Dashboard(){
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState('Safe');
  const [coords, setCoords] = useState(null);
  const [path, setPath] = useState([]);

  // Called when SOS starts/stops
  function handleStatus(active){
    setStatus(active ? 'SOS Active' : 'Safe');
  }

  // Called on each position update
  function handlePosition(pos){
    setCoords(pos);
    setPath(p=>[...p, pos]);
  }

  // Reset path when user logs out or when Safe
  useEffect(()=>{ if (status === 'Safe') setPath([]); }, [status, user]);

  return (
    <div className="dashboard">
      <div className="panel">
        <h2>Hi, {user?.name || 'User'}</h2>
        <div className="status-row">
          <div className={`status-pill ${status === 'Safe' ? 'safe' : 'danger'}`}>{status}</div>
          <div className="coords">
            {coords ? (`Lat: ${coords.latitude.toFixed(5)}, Lon: ${coords.longitude.toFixed(5)}`) : 'Location: —'}
          </div>
        </div>
        <div style={{marginTop:12}}>
          <SOSButton onActivate={()=>handleStatus(true)} onDeactivate={()=>handleStatus(false)} onPosition={handlePosition} />
        </div>
      </div>
      <div className="map-panel">
        <LiveMap positions={path} />
      </div>
    </div>
  );
}

export default Dashboard;
