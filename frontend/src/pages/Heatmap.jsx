import { GoogleMap, HeatmapLayer, useJsApiLoader } from "@react-google-maps/api";
import axios from "axios";
import { useEffect, useState } from "react";

const containerStyle = {
  width: "100%",
  height: "80vh"
};

export default function Heatmap() {
  const [points, setPoints] = useState([]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_KEY",
    libraries: ["visualization"]
  });

  useEffect(() => {
    axios.get("http://localhost:5000/api/reports").then(res => {
      const heatData = res.data.map(r => ({
        location: new window.google.maps.LatLng(
          r.coordinates.lat,
          r.coordinates.lng
        ),
        weight: r.riskScore
      }));
      setPoints(heatData);
    });
  }, []);

  if (!isLoaded) return <p>Loading Map...</p>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{ lat: 28.61, lng: 77.21 }}
      zoom={12}
    >
      <HeatmapLayer data={points} />
    </GoogleMap>
  );
}
