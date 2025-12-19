import React, { useState, useEffect } from "react";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [reports, setReports] = useState([]);

  // LOGIN
  const loginUser = async () => {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setToken(data.token);
    alert("Login successful");
  };

  // CREATE REPORT
  const createReport = async () => {
    await fetch("http://localhost:5000/api/reports/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ title, description, location }),
    });

    alert("Report created");
    fetchReports();
  };

  // GET MY REPORTS
  const fetchReports = async () => {
    const res = await fetch("http://localhost:5000/api/reports/my", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    const data = await res.json();
    setReports(data);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>SAFESHE 🚨</h1>

      {!token && (
        <>
          <h2>Login</h2>
          <input
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <br />
          <input
            placeholder="Password"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />
          <button onClick={loginUser}>Login</button>
        </>
      )}

      {token && (
        <>
          <h2>Create Report</h2>
          <input
            placeholder="Title"
            onChange={(e) => setTitle(e.target.value)}
          />
          <br />
          <textarea
            placeholder="Description"
            onChange={(e) => setDescription(e.target.value)}
          />
          <br />
          <input
            placeholder="Location"
            onChange={(e) => setLocation(e.target.value)}
          />
          <br />
          <button onClick={createReport}>Submit Report</button>

          <h2>My Reports</h2>
          <button onClick={fetchReports}>Load My Reports</button>

          <ul>
            {reports.map((r) => (
              <li key={r._id}>
                <b>{r.title}</b> — {r.location}  
                <br />
                {r.description}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
