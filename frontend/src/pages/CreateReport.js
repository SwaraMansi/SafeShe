import { useState } from "react";

function CreateReport() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:5000/api/reports/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, location }),
    });

    const data = await res.json();
    alert(data.message || "Report created");
  };

  return (
    <div>
      <h2>Create Report</h2>

      <input placeholder="Title" onChange={(e) => setTitle(e.target.value)} />
      <br /><br />

      <textarea
        placeholder="Description"
        onChange={(e) => setDescription(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Location"
        onChange={(e) => setLocation(e.target.value)}
      />
      <br /><br />

      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default CreateReport;
