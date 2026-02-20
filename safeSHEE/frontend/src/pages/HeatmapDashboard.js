/**
 * Case Heatmap System - Updated with Red Zone Creation
 * Police can click on map OR enter coordinates manually to create red zones
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const HeatmapDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const heatmapLayer = useRef(null);
  const redZoneLayer = useRef(null);

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showRedZones, setShowRedZones] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);

  const [redZones, setRedZones] = useState([]);
  const [createMode, setCreateMode] = useState(false);
  const [pendingZone, setPendingZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius_meters: 500,
    risk_level: "high",
    description: "",
  });
  const [zoneMsg, setZoneMsg] = useState("");
  const [zoneLoading, setZoneLoading] = useState(false);
  const tempMarkerRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== "police") navigate("/");
  }, [user, navigate]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${BASE_URL}/reports/locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const locs = data.locations || [];
        setLocations(locs);
        setCategories([
          ...new Set(locs.map((l) => l.category).filter(Boolean)),
        ]);
      } else {
        setError("Failed to fetch location data");
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchRedZones = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/redzones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const manual = Array.isArray(data)
          ? data.filter((z) => z.type === "manual")
          : [];
        setRedZones(manual);
      }
    } catch (err) {
      console.error("Red zone fetch error:", err);
    }
  }, [token]);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;
    mapInstance.current = L.map(mapContainer.current).setView(
      [28.7041, 77.1025],
      12,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapInstance.current);
    markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    redZoneLayer.current = L.layerGroup().addTo(mapInstance.current);
    fetchLocations();
    fetchRedZones();
  }, [token]);

  async function getLocationName(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      return (
        data.address?.neighbourhood ||
        data.address?.suburb ||
        data.address?.village ||
        data.address?.road ||
        data.address?.town ||
        data.address?.city ||
        ""
      );
    } catch {
      return "";
    }
  }

  // Place marker on map at given lat/lng
  function placeMarkerOnMap(lat, lng) {
    if (!mapInstance.current) return;
    if (tempMarkerRef.current)
      mapInstance.current.removeLayer(tempMarkerRef.current);
    tempMarkerRef.current = L.marker([lat, lng], {
      icon: L.divIcon({
        html: `<div style="background:#dc2626;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(220,38,38,0.8)"></div>`,
        iconSize: [16, 16],
        className: "",
      }),
    }).addTo(mapInstance.current);
    mapInstance.current.setView([lat, lng], 15);
  }

  // Map click handler
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    async function onMapClick(e) {
      if (!createMode) return;
      const { lat, lng } = e.latlng;
      placeMarkerOnMap(lat, lng);
      setPendingZone({ lat, lng });
      setZoneForm((p) => ({
        ...p,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
      }));
      setZoneMsg("");
      // Auto-fill zone name
      setZoneForm((p) => ({ ...p, name: p.name || "📍 Fetching location..." }));
      const name = await getLocationName(lat, lng);
      setZoneForm((p) => ({
        ...p,
        name: p.name === "📍 Fetching location..." ? name || "" : p.name,
      }));
    }
    map.on("click", onMapClick);
    return () => map.off("click", onMapClick);
  }, [createMode]);

  // Draw red zones on map
  useEffect(() => {
    if (!mapInstance.current || !redZoneLayer.current) return;
    redZoneLayer.current.clearLayers();
    if (!showRedZones) return;
    redZones.forEach((zone) => {
      const lat = zone.center?.latitude;
      const lng = zone.center?.longitude;
      if (!lat || !lng) return;
      const color =
        zone.riskLevel === "critical"
          ? "#dc2626"
          : zone.riskLevel === "high"
            ? "#ea580c"
            : zone.riskLevel === "medium"
              ? "#eab308"
              : "#16a34a";
      L.circle([lat, lng], {
        radius: zone.radiusMeters || 500,
        color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2,
      })
        .bindPopup(
          `
          <div style="font-size:13px;min-width:150px">
            <strong>🚩 ${zone.name}</strong><br/>
            <span style="color:${color};font-weight:bold;text-transform:uppercase">${zone.riskLevel} RISK</span><br/>
            Radius: ${zone.radiusMeters}m<br/>
            ${zone.description ? `<em>${zone.description}</em>` : ""}
          </div>
        `,
        )
        .addTo(redZoneLayer.current);
      L.marker([lat, lng], {
        icon: L.divIcon({
          html: `<div style="background:${color};color:white;padding:2px 6px;border-radius:10px;font-size:10px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3)">🚩 ${zone.name}</div>`,
          className: "",
          iconAnchor: [0, 0],
        }),
      }).addTo(redZoneLayer.current);
    });
  }, [redZones, showRedZones]);

  // Update markers and heatmap
  useEffect(() => {
    if (!mapInstance.current || !locations.length) return;
    const filtered =
      selectedCategory === "all"
        ? locations
        : locations.filter((l) => l.category === selectedCategory);
    markersLayer.current?.clearLayers();
    if (showMarkers) {
      filtered.forEach((loc) => {
        if (!loc.latitude || !loc.longitude) return;
        const color =
          loc.risk_score > 70
            ? "red"
            : loc.risk_score > 40
              ? "orange"
              : "green";
        L.marker([loc.latitude, loc.longitude], {
          icon: L.divIcon({
            html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:bold">${loc.risk_score}</div>`,
            iconSize: [24, 24],
            className: "",
          }),
        })
          .bindPopup(
            `<div style="font-size:12px"><strong>${loc.category}</strong><br/>Risk: ${loc.risk_score}<br/>Status: ${loc.status}</div>`,
          )
          .addTo(markersLayer.current);
      });
    }
    if (showHeatmap) {
      if (heatmapLayer.current)
        mapInstance.current.removeLayer(heatmapLayer.current);
      const heatData = filtered
        .filter((l) => l.latitude && l.longitude)
        .map((l) => [l.latitude, l.longitude, (l.risk_score || 50) / 100]);
      if (heatData.length > 0) {
        heatmapLayer.current = L.heatLayer(heatData, {
          max: 1,
          radius: 35,
          blur: 25,
          gradient: { 0.0: "#2ecc71", 0.5: "#f39c12", 1.0: "#e74c3c" },
        }).addTo(mapInstance.current);
      }
    } else if (heatmapLayer.current) {
      mapInstance.current.removeLayer(heatmapLayer.current);
      heatmapLayer.current = null;
    }
  }, [locations, showMarkers, showHeatmap, selectedCategory]);

  // Use my current location
  function useCurrentLocation() {
    setZoneMsg("📍 Getting your location...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setPendingZone({ lat, lng });
        setZoneForm((p) => ({
          ...p,
          latitude: String(lat),
          longitude: String(lng),
        }));
        placeMarkerOnMap(lat, lng);
        setZoneMsg("✅ Current location set!");
        setTimeout(() => setZoneMsg(""), 2000);
      },
      () => setZoneMsg("❌ Location access denied"),
    );
  }

  // Handle manual lat/lng input change
  function handleLatLngChange(field, value) {
    setZoneForm((p) => ({ ...p, [field]: value }));
    const lat =
      field === "latitude" ? parseFloat(value) : parseFloat(zoneForm.latitude);
    const lng =
      field === "longitude"
        ? parseFloat(value)
        : parseFloat(zoneForm.longitude);
    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      setPendingZone({ lat, lng });
      placeMarkerOnMap(lat, lng);
    }
  }

  async function handleCreateZone(e) {
    e.preventDefault();
    if (!pendingZone) {
      setZoneMsg("❌ Location select karo pehle");
      return;
    }
    if (!zoneForm.name) {
      setZoneMsg("❌ Zone name required hai");
      return;
    }
    setZoneLoading(true);
    setZoneMsg("");
    try {
      const res = await fetch(`${BASE_URL}/redzones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: zoneForm.name,
          latitude: pendingZone.lat,
          longitude: pendingZone.lng,
          radius_meters: zoneForm.radius_meters,
          risk_level: zoneForm.risk_level,
          description: zoneForm.description,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setZoneMsg("✅ Red zone create ho gaya!");
        setZoneForm({
          name: "",
          latitude: "",
          longitude: "",
          radius_meters: 500,
          risk_level: "high",
          description: "",
        });
        setPendingZone(null);
        setCreateMode(false);
        if (tempMarkerRef.current) {
          mapInstance.current.removeLayer(tempMarkerRef.current);
          tempMarkerRef.current = null;
        }
        fetchRedZones();
        setTimeout(() => setZoneMsg(""), 3000);
      } else {
        setZoneMsg(`❌ ${data.message}`);
      }
    } catch (err) {
      setZoneMsg("❌ Network error");
    } finally {
      setZoneLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this red zone?")) return;
    try {
      const res = await fetch(`${BASE_URL}/redzones/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRedZones((prev) => prev.filter((z) => z.id !== id));
        setZoneMsg("✅ Deleted");
        setTimeout(() => setZoneMsg(""), 2000);
      }
    } catch {
      setZoneMsg("❌ Delete failed");
    }
  }

  function cancelCreate() {
    setCreateMode(false);
    setPendingZone(null);
    setZoneForm({
      name: "",
      latitude: "",
      longitude: "",
      radius_meters: 500,
      risk_level: "high",
      description: "",
    });
    setZoneMsg("");
    if (tempMarkerRef.current && mapInstance.current) {
      mapInstance.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  }

  if (!user || user.role !== "police")
    return (
      <div style={{ padding: "20px", color: "#ef4444" }}>Unauthorized</div>
    );

  const riskColors = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#eab308",
    low: "#16a34a",
  };

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
        backgroundColor: "#0f172a",
        color: "#fff",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            🗺️ Incident Heatmap
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "14px" }}>
            Geographic density, risk hotspots & red zone management
          </p>
        </div>
        <button
          onClick={() => navigate("/police")}
          style={{
            padding: "10px 18px",
            backgroundColor: "#1e293b",
            color: "#93c5fd",
            border: "1px solid #3b82f6",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          ← Back to Incident Management
        </button>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {[
          { label: "📍 Markers", val: showMarkers, set: setShowMarkers },
          { label: "🔥 Heatmap", val: showHeatmap, set: setShowHeatmap },
          { label: "🚩 Red Zones", val: showRedZones, set: setShowRedZones },
        ].map(({ label, val, set }) => (
          <label
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              padding: "8px 12px",
              backgroundColor: val ? "#3b82f6" : "#1e293b",
              borderRadius: "4px",
              border: "1px solid #374151",
              fontSize: "14px",
            }}
          >
            <input
              type="checkbox"
              checked={val}
              onChange={(e) => set(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            {label}
          </label>
        ))}

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: "8px 12px",
            backgroundColor: "#1e293b",
            color: "#fff",
            border: "1px solid #374151",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <button
          onClick={fetchLocations}
          style={{
            padding: "8px 16px",
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          🔄 Refresh
        </button>

        <button
          onClick={() => (createMode ? cancelCreate() : setCreateMode(true))}
          style={{
            padding: "8px 16px",
            backgroundColor: createMode ? "#7f1d1d" : "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          {createMode ? "✕ Cancel" : "+ Create Red Zone"}
        </button>
      </div>

      {createMode && (
        <div
          style={{
            marginBottom: "12px",
            padding: "10px 16px",
            backgroundColor: "#1e3a5f",
            border: "1px solid #3b82f6",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#93c5fd",
          }}
        >
          🖱️ Map pe click karo <strong>ya</strong> neeche manually coordinates
          enter karo <strong>ya</strong> "Use My Location" dabao
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#7f1d1d",
            border: "1px solid #dc2626",
            borderRadius: "4px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: "20px",
        }}
      >
        {/* Left: Map + Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            ref={mapContainer}
            style={{
              height: "560px",
              borderRadius: "8px",
              border: `2px solid ${createMode ? "#3b82f6" : "#374151"}`,
              overflow: "hidden",
              cursor: createMode ? "crosshair" : "grab",
              transition: "border-color 0.3s",
            }}
          />

          {/* Red Zone Creation Form */}
          {createMode && (
            <div
              style={{
                backgroundColor: "#1e293b",
                border: "1px solid #374151",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px",
                  color: "#f1f5f9",
                  fontSize: "15px",
                }}
              >
                🚩 New Red Zone Details
              </h3>

              {zoneMsg && (
                <div
                  style={{
                    padding: "8px 12px",
                    marginBottom: "12px",
                    borderRadius: "4px",
                    fontSize: "13px",
                    backgroundColor: zoneMsg.startsWith("✅")
                      ? "#064e3b"
                      : "#7f1d1d",
                    color: zoneMsg.startsWith("✅") ? "#a7f3d0" : "#fca5a5",
                  }}
                >
                  {zoneMsg}
                </div>
              )}

              <form onSubmit={handleCreateZone}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  {/* Zone Name */}
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={lbl}>Zone Name *</label>
                    <input
                      style={inp}
                      placeholder="e.g. Sarita Vihar Market"
                      value={zoneForm.name}
                      onChange={(e) =>
                        setZoneForm((p) => ({ ...p, name: e.target.value }))
                      }
                      required
                    />
                  </div>

                  {/* ✅ Use My Location Button */}
                  <div style={{ gridColumn: "1/-1" }}>
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      style={{
                        width: "100%",
                        padding: "9px",
                        backgroundColor: "#1e3a5f",
                        color: "#93c5fd",
                        border: "1px solid #3b82f6",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "bold",
                      }}
                    >
                      📍 Use My Current Location
                    </button>
                  </div>

                  {/* ✅ Manual Latitude */}
                  <div>
                    <label style={lbl}>Latitude *</label>
                    <input
                      style={inp}
                      type="number"
                      step="any"
                      placeholder="e.g. 28.5109"
                      value={zoneForm.latitude}
                      onChange={(e) =>
                        handleLatLngChange("latitude", e.target.value)
                      }
                    />
                  </div>

                  {/* ✅ Manual Longitude */}
                  <div>
                    <label style={lbl}>Longitude *</label>
                    <input
                      style={inp}
                      type="number"
                      step="any"
                      placeholder="e.g. 77.3148"
                      value={zoneForm.longitude}
                      onChange={(e) =>
                        handleLatLngChange("longitude", e.target.value)
                      }
                    />
                  </div>

                  <p
                    style={{
                      gridColumn: "1/-1",
                      fontSize: "11px",
                      color: "#6b7280",
                      margin: "0",
                    }}
                  >
                    Ya map pe click karo — coordinates automatically fill ho
                    jaayenge
                  </p>

                  {/* Radius */}
                  <div>
                    <label style={lbl}>Radius (meters)</label>
                    <input
                      style={inp}
                      type="number"
                      min="100"
                      max="10000"
                      value={zoneForm.radius_meters}
                      onChange={(e) =>
                        setZoneForm((p) => ({
                          ...p,
                          radius_meters: parseInt(e.target.value),
                        }))
                      }
                    />
                  </div>

                  {/* Risk Level */}
                  <div>
                    <label style={lbl}>Risk Level</label>
                    <select
                      style={inp}
                      value={zoneForm.risk_level}
                      onChange={(e) =>
                        setZoneForm((p) => ({
                          ...p,
                          risk_level: e.target.value,
                        }))
                      }
                    >
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={lbl}>Description (optional)</label>
                    <input
                      style={inp}
                      placeholder="Reason for marking..."
                      value={zoneForm.description}
                      onChange={(e) =>
                        setZoneForm((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Selected location preview */}
                {pendingZone && (
                  <div
                    style={{
                      padding: "8px 12px",
                      marginBottom: "10px",
                      backgroundColor: "#064e3b",
                      border: "1px solid #10b981",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "#4ade80",
                    }}
                  >
                    ✅ Location: {pendingZone.lat.toFixed(4)},{" "}
                    {pendingZone.lng.toFixed(4)}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="submit"
                    disabled={zoneLoading || !pendingZone}
                    style={{
                      flex: 1,
                      padding: "10px",
                      backgroundColor: pendingZone ? "#dc2626" : "#4b5563",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: pendingZone ? "pointer" : "not-allowed",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    {zoneLoading
                      ? "Creating..."
                      : pendingZone
                        ? "🚩 Create Zone"
                        : "⬆️ Location Select Karo Pehle"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelCreate}
                    style={{
                      padding: "10px 16px",
                      backgroundColor: "#374151",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right: Active Red Zones */}
        <div
          style={{
            backgroundColor: "#1e293b",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "16px",
            maxHeight: "560px",
            overflowY: "auto",
          }}
        >
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "600",
              marginBottom: "12px",
              color: "#f1f5f9",
            }}
          >
            🚩 Active Red Zones ({redZones.length})
          </h3>
          {zoneMsg && !createMode && (
            <div
              style={{
                padding: "6px 10px",
                marginBottom: "8px",
                borderRadius: "4px",
                fontSize: "12px",
                backgroundColor: zoneMsg.startsWith("✅")
                  ? "#064e3b"
                  : "#7f1d1d",
                color: zoneMsg.startsWith("✅") ? "#a7f3d0" : "#fca5a5",
              }}
            >
              {zoneMsg}
            </div>
          )}
          {redZones.length === 0 ? (
            <div
              style={{
                color: "#6b7280",
                fontSize: "13px",
                textAlign: "center",
                padding: "30px 0",
              }}
            >
              <div style={{ fontSize: "2em", marginBottom: "8px" }}>🚩</div>
              No red zones yet.
              <br />
              Click "+ Create Red Zone" to add one.
            </div>
          ) : (
            redZones.map((zone) => (
              <div
                key={zone.id}
                style={{
                  marginBottom: "10px",
                  padding: "10px",
                  backgroundColor: "#0f172a",
                  border: `2px solid ${riskColors[zone.riskLevel] || "#ea580c"}`,
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: "13px",
                        color: "#f1f5f9",
                      }}
                    >
                      🚩 {zone.name}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#9ca3af",
                        marginTop: "3px",
                      }}
                    >
                      Radius: {zone.radiusMeters}m &nbsp;·&nbsp;
                      <span
                        style={{
                          color: riskColors[zone.riskLevel] || "#ea580c",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                        }}
                      >
                        {zone.riskLevel === "high"
                          ? "🔴"
                          : zone.riskLevel === "medium"
                            ? "🟡"
                            : "🟢"}{" "}
                        {zone.riskLevel}
                      </span>
                    </div>
                    {zone.description && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#6b7280",
                          marginTop: "3px",
                        }}
                      >
                        {zone.description}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#4b5563",
                        marginTop: "3px",
                      }}
                    >
                      📍 {zone.center?.latitude?.toFixed(4)},{" "}
                      {zone.center?.longitude?.toFixed(4)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(zone.id)}
                    style={{
                      padding: "3px 8px",
                      backgroundColor: "#7f1d1d",
                      color: "#fca5a5",
                      border: "1px solid #dc2626",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "11px",
                      marginLeft: "8px",
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: "16px",
          padding: "14px 16px",
          backgroundColor: "#1e293b",
          border: "1px solid #374151",
          borderRadius: "8px",
        }}
      >
        <h4 style={{ marginBottom: "8px", fontSize: "13px", color: "#9ca3af" }}>
          Legend
        </h4>
        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            fontSize: "12px",
          }}
        >
          {[
            ["#ef4444", "High Risk (>70)"],
            ["#f59e0b", "Medium Risk (40-70)"],
            ["#10b981", "Low Risk (<40)"],
          ].map(([color, label]) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: color,
                }}
              />
              {label}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: "#dc2626",
                border: "2px solid rgba(220,38,38,0.3)",
              }}
            />
            Red Zone (Police Marked)
          </div>
        </div>
      </div>
    </div>
  );
};

const lbl = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "#9ca3af",
  marginBottom: "4px",
};
const inp = {
  width: "100%",
  padding: "7px 10px",
  border: "1px solid #374151",
  borderRadius: "4px",
  fontSize: "13px",
  boxSizing: "border-box",
  fontFamily: "inherit",
  backgroundColor: "#0f172a",
  color: "#fff",
};

export default HeatmapDashboard;
