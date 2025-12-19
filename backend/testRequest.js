const axios = require("axios");

axios.post(
  "http://localhost:5000/api/reports/create",
  {
    title: "Harassment",
    description: "Someone followed me near metro station",
    location: "Delhi"
  },
  {
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5M2YxZGViZWNiMTA0MzI4MTM4N2RhOSIsImlhdCI6MTc2NjA5NzAxNywiZXhwIjoxNzY2MTgzNDE3fQ.tjdw5QI_h4--V9bpG_o5tnY3TWefbfNaG9OQWgQYCGk"
    }
  }
)
.then(res => {
  console.log("✅ Success:");
  console.log(res.data);
})
.catch(err => {
  console.log("❌ Error:");
  if (err.response) {
    console.log(err.response.data);
  } else {
    console.log(err.message);
  }
});
