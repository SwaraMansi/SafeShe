import { useEffect, useState } from "react";
import { getMyReports } from "../services/api";

export default function MyReports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    getMyReports(token).then(setReports);
  }, []);

  const riskColor = (risk) => {
    if (risk >= 4) return "text-red-600";
    if (risk === 3) return "text-yellow-500";
    return "text-green-600";
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Reports</h2>

      {reports.map((r) => (
        <div key={r._id} className="bg-white p-4 mb-3 rounded shadow">
          <h3 className="font-semibold">{r.title}</h3>
          <p>{r.description}</p>
          <p>Category: {r.category}</p>
          <p className={riskColor(r.riskScore)}>
            Risk Score: {r.riskScore}
          </p>
        </div>
      ))}
    </div>
  );
}
