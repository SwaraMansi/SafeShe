const API = "http://localhost:5000/api";

export const loginUser = async (data) => {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const createReport = async (data, token) => {
  const res = await fetch(`${API}/reports/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const getMyReports = async (token) => {
  const res = await fetch(`${API}/reports/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
};
