import React, { useState, useRef, useEffect } from 'react';

// SOSButton handles starting/stopping SOS using geolocation watchPosition.
// This implementation is frontend-only and will mock API responses.
function SOSButton({ onActivate, onDeactivate, onPosition }){
  const [active, setActive] = useState(false);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  function handleError(err){
    alert('Geolocation error: ' + (err?.message || err));
    stop();
  }

  function start(){
    if (!navigator.geolocation) return alert('Geolocation not supported');
    // get immediate position
    navigator.geolocation.getCurrentPosition((pos)=>{
      const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, timestamp: pos.timestamp };
      onPosition && onPosition(p);
    }, handleError, { enableHighAccuracy:true });

    // start watchPosition to get frequent updates
    watchIdRef.current = navigator.geolocation.watchPosition((pos)=>{
      const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, timestamp: pos.timestamp };
      onPosition && onPosition(p);
    }, handleError, { enableHighAccuracy:true, maximumAge:0, distanceFilter:0 });

    // simulate periodic "update" every 5 seconds (frontend-only mock)
    intervalRef.current = setInterval(()=>{
      navigator.geolocation.getCurrentPosition((pos)=>{
        const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, timestamp: pos.timestamp };
        onPosition && onPosition(p);
      }, handleError, { enableHighAccuracy:true });
    }, 5000);

    setActive(true);
    onActivate && onActivate();
  }

  function stop(){
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    watchIdRef.current = null;
    intervalRef.current = null;
    setActive(false);
    onDeactivate && onDeactivate();
  }

  useEffect(()=>{ return ()=>{ stop(); }; }, []);

  return (
    <div className="sos-control">
      {active ? (
        <button className="btn-stop" onClick={stop} aria-label="Stop SOS">Stop SOS</button>
      ) : (
        <button className="btn-sos" onClick={start} aria-label="Start SOS">SOS</button>
      )}
    </div>
  );
}

export default SOSButton;
