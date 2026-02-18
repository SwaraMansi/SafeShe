import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// LiveMap shows the user's path and any active alerts.
function LiveMap({ positions = [], alerts = [], unsafeZones = [] }){
  const mapRef = useRef(null);
  const pathRef = useRef(null);
  const userMarkerRef = useRef(null);
  const alertsLayerRef = useRef(null);

  // Show browser notification for high-risk alert
  useEffect(() => {
    if (alerts && alerts.length) {
      const highRisk = alerts.find(a => a.risk && a.risk > 70);
      if (highRisk) {
        if (window.Notification && Notification.permission === 'granted') {
          new Notification('Red Zone Alert', {
            body: 'You have entered a high-risk (red zone) area! Stay alert.',
            icon: '/favicon.ico'
          });
        } else if (window.Notification && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Red Zone Alert', {
                body: 'You have entered a high-risk (red zone) area! Stay alert.',
                icon: '/favicon.ico'
              });
            }
          });
        } else {
          alert('Red Zone Alert: You have entered a high-risk area! Stay alert.');
        }
      }
    }
  }, [alerts]);

  useEffect(()=>{
    if (!mapRef.current){
      mapRef.current = L.map('map', { preferCanvas:true }).setView([20,0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(mapRef.current);
      alertsLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }
    // update alerts
    alertsLayerRef.current.clearLayers();
    if (alerts && alerts.length){
      alerts.forEach(a=>{
        try{
          const color = (a.risk && a.risk > 70) ? '#ff4d4f' : (a.risk && a.risk > 40 ? '#ffbb00' : '#4cd964');
          L.circleMarker([a.latitude, a.longitude], { color, radius:8 }).addTo(alertsLayerRef.current).bindPopup(`${a.name||a.email} <br/>Risk: ${a.risk || 0}`);
        }catch(e){}
      });
    }

    // render unsafe zones
    if (unsafeZones && unsafeZones.length){
      unsafeZones.forEach(z=>{
        try{
          const r = 80 + z.count * 20;
          const color = z.risk > 70 ? 'rgba(255,77,79,0.25)' : 'rgba(176,0,32,0.12)';
          L.circle([z.lat, z.lng], { radius: r, color: color, fillColor: color }).addTo(mapRef.current).bindPopup(`Complaints: ${z.count}<br/>Risk: ${z.risk}`);
        }catch(e){}
      });
    }

    // update path polyline
    if (pathRef.current) mapRef.current.removeLayer(pathRef.current);
    if (positions && positions.length){
      const latlngs = positions.map(p=>[p.latitude, p.longitude]);
      pathRef.current = L.polyline(latlngs, { color:'#b00020' }).addTo(mapRef.current);
      // update user marker
      const last = latlngs[latlngs.length-1];
      if (userMarkerRef.current) userMarkerRef.current.setLatLng(last);
      else userMarkerRef.current = L.marker(last).addTo(mapRef.current).bindPopup('You');
      mapRef.current.setView(last, 15);
    }

    return ()=>{};
  }, [positions, alerts]);

  return <div id="map" style={{width:'100%', height:'100%'}} />;
}

export default LiveMap;
