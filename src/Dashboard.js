import api from "./api";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    api.get('/api/report')
      .then(res => setReports(res));
  }, []);

  return (
    <div>
      <h2>Police Dashboard</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Category</th>
            <th>Risk</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(r => (
            <tr key={r._id}>
              <td>{r.category}</td>
              <td>{r.riskScore}</td>
              <td>{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
