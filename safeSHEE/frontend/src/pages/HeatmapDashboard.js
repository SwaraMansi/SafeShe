/**
 * Case Heatmap System
 * Visualizes incident density and risk hot-spots using Leaflet
 */

import React, { useEffect, useState, useRef } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Heatmap.js library (loaded dynamically)
let HeatmapLayer = null;

const HeatmapDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const heatmapLayer = useRef(null);

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [topAreas, setTopAreas] = useState([]);

  // Role check
  useEffect(() => {
    if (!user || user.role !== 'police') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load Heatmap.js library
  useEffect(() => {
    if (!window.h337) {
      const script = document.createElement('script');
      script.src = 'https://www.patrick-wied.at/static/heatmapjs/heatmap.js';
      script.onload = () => {
        HeatmapLayer = window.h337;
      };
      document.head.appendChild(script);
    } else {
      HeatmapLayer = window.h337;
    }
  }, []);

  // Fetch location data
  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError('');
      const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

      const response = await fetch(`${baseURL}/reports/locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);

        // Extract unique categories
        const uniqueCategories = [...new Set(data.locations?.map(loc => loc.category) || [])];
        setCategories(uniqueCategories);

        // Calculate top unsafe areas
        calculateTopAreas(data.locations || []);
      } else {
        setError('Failed to fetch location data');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate top 5 most unsafe areas (clustering by proximity)
  const calculateTopAreas = (locs) => {
    if (locs.length === 0) {
      setTopAreas([]);
      return;
    }

    // Simple clustering: group points within 1km radius
    const clusters = [];
    const processed = new Set();

    locs.forEach((loc, idx) => {
      if (processed.has(idx)) return;

      const cluster = [loc];
      processed.add(idx);
      let totalRisk = loc.risk_score || 0;

      locs.forEach((loc2, idx2) => {
        if (processed.has(idx2)) return;

        const distance = getDistance(loc.latitude, loc.longitude, loc2.latitude, loc2.longitude);
        if (distance < 1) { // 1km radius
          cluster.push(loc2);
          totalRisk += loc2.risk_score || 0;
          processed.add(idx2);
        }
      });

      const avgLat = cluster.reduce((sum, l) => sum + l.latitude, 0) / cluster.length;
      const avgLon = cluster.reduce((sum, l) => sum + l.longitude, 0) / cluster.length;
      const avgRisk = totalRisk / cluster.length;

      clusters.push({
        latitude: avgLat,
        longitude: avgLon,
        count: cluster.length,
        avgRisk: Math.round(avgRisk),
        categories: [...new Set(cluster.map(c => c.category))]
      });
    });

    // Sort by average risk and take top 5
    const topFive = clusters
      .sort((a, b) => b.avgRisk - a.avgRisk)
      .slice(0, 5)
      .map((area, idx) => ({
        ...area,
        rank: idx + 1
      }));

    setTopAreas(topFive);
  };

  // Haversine distance formula
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    mapInstance.current = L.map(mapContainer.current).setView([28.7041, 77.1025], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapInstance.current);

    markersLayer.current = L.layerGroup().addTo(mapInstance.current);

    // Fetch locations after map is ready
    fetchLocations();
  }, [token]);

  // Filter locations and update visualization
  useEffect(() => {
    if (!mapInstance.current || !locations.length) return;

    // Filter by category
    const filteredLocations = selectedCategory === 'all'
      ? locations
      : locations.filter(loc => loc.category === selectedCategory);

    // Update markers
    if (showMarkers) {
      markersLayer.current?.clearLayers();
      filteredLocations.forEach(loc => {
        if (loc.latitude && loc.longitude) {
          const riskLevel = loc.risk_score > 70 ? 'high' : loc.risk_score > 40 ? 'medium' : 'low';
          const markerColor = riskLevel === 'high' ? 'red' : riskLevel === 'medium' ? 'orange' : 'green';

          const icon = L.divIcon({
            html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; font-weight: bold;">${loc.risk_score}</div>`,
            iconSize: [24, 24],
            className: ''
          });

          L.marker([loc.latitude, loc.longitude], { icon })
            .bindPopup(`
              <div style="font-size: 12px;">
                <strong>${loc.category}</strong><br/>
                Risk: ${loc.risk_score}<br/>
                Status: ${loc.status}
              </div>
            `)
            .addTo(markersLayer.current);
        }
      });
    } else {
      markersLayer.current?.clearLayers();
    }

    // Update heatmap
    if (showHeatmap && HeatmapLayer) {
      if (heatmapLayer.current) {
        mapInstance.current.removeLayer(heatmapLayer.current);
      }

      const heatData = filteredLocations
        .filter(loc => loc.latitude && loc.longitude)
        .map(loc => ({
          lat: loc.latitude,
          lng: loc.longitude,
          value: loc.risk_score || 50
        }));

      if (heatData.length > 0) {
        heatmapLayer.current = L.heatLayer(heatData, {
          max: 100,
          radius: 35,
          blur: 25,
          gradient: {
            0.0: '#2ecc71',
            0.5: '#f39c12',
            1.0: '#e74c3c'
          }
        }).addTo(mapInstance.current);
      }
    } else if (!showHeatmap && heatmapLayer.current) {
      mapInstance.current.removeLayer(heatmapLayer.current);
      heatmapLayer.current = null;
    }
  }, [locations, showMarkers, showHeatmap, selectedCategory]);

  if (!user || user.role !== 'police') {
    return <div style={{ padding: '20px', color: '#ef4444' }}>Unauthorized</div>;
  }

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: '#0f172a',
      color: '#fff',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>🗺️ Incident Heatmap</h1>
        <p style={{
          color: '#9ca3af',
          fontSize: '14px'
        }}>Geographic density and risk hotspot visualization</p>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Visualization Toggles */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 12px',
            backgroundColor: showMarkers ? '#3b82f6' : '#1e293b',
            borderRadius: '4px',
            border: '1px solid #374151'
          }}>
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(e) => setShowMarkers(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            📍 Markers
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 12px',
            backgroundColor: showHeatmap ? '#3b82f6' : '#1e293b',
            borderRadius: '4px',
            border: '1px solid #374151'
          }}>
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            🔥 Heatmap
          </label>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '8px 12px',
            backgroundColor: '#1e293b',
            color: '#fff',
            border: '1px solid #374151',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={fetchLocations}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: '#7f1d1d',
          border: '1px solid #dc2626',
          borderRadius: '4px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main content grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '20px'
      }}>
        {/* Map */}
        <div
          ref={mapContainer}
          style={{
            height: '600px',
            borderRadius: '8px',
            border: '1px solid #374151',
            overflow: 'hidden'
          }}
        />

        {/* Top Unsafe Areas Panel */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '16px',
          overflowY: 'auto',
          maxHeight: '600px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#f1f5f9'
          }}>
            🚨 Top 5 Unsafe Areas
          </h3>

          {topAreas.length > 0 ? (
            topAreas.map(area => (
              <div
                key={area.rank}
                style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: '#0f172a',
                  border: `2px solid ${area.avgRisk > 70 ? '#ef4444' : area.avgRisk > 40 ? '#f59e0b' : '#10b981'}`,
                  borderRadius: '4px'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{ fontWeight: 'bold' }}>#{area.rank}</span>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 6px',
                    backgroundColor: area.avgRisk > 70 ? '#7f1d1d' : area.avgRisk > 40 ? '#78350f' : '#064e3b',
                    borderRadius: '2px',
                    color: area.avgRisk > 70 ? '#fca5a5' : area.avgRisk > 40 ? '#fed7aa' : '#a7f3d0'
                  }}>
                    Risk: {area.avgRisk}
                  </span>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  marginBottom: '4px'
                }}>
                  {area.count} incidents
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#6b7280'
                }}>
                  {area.categories.slice(0, 2).join(', ')}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: '#6b7280', fontSize: '12px' }}>
              No incident clusters detected
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#1e293b',
        border: '1px solid #374151',
        borderRadius: '8px'
      }}>
        <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>Legend</h4>
        <div style={{
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#ef4444'
            }} />
            High Risk (&gt;70)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b'
            }} />
            Medium Risk (40-70)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#10b981'
            }} />
            Low Risk (&lt;40)
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapDashboard;
