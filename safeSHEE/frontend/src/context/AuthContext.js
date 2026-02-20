import React, { createContext, useState, useEffect } from "react";

// AuthContext provides auth state and API methods
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("safeshee_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() =>
    localStorage.getItem("safeshee_token"),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dynamically detect API base URL
  const API_BASE =
    process.env.REACT_APP_API ||
    (window.location.hostname === "localhost"
      ? `http://localhost:5000`
      : "https://backend.herokuapp.com");

  useEffect(() => {
    if (user) {
      localStorage.setItem("safeshee_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("safeshee_user");
    }

    if (token) {
      localStorage.setItem("safeshee_token", token);
    } else {
      localStorage.removeItem("safeshee_token");
    }
  }, [user, token]);

  // Register with role selection
  async function register({ name, email, password, role = "user" }) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration failed");
      setUser(data.user);
      setToken(data.token);
      return { user: data.user, token: data.token };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  // Login with real backend
  async function login({ email, password }) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");
      setUser(data.user);
      setToken(data.token);
      return { user: data.user, token: data.token };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  // ✅ Fixed Logout: Clears state, storage, and reloads memory
  function logout() {
    // 1. Clear Context State
    setUser(null);
    setToken(null);
    setError(null);

    // 2. Clear Local Storage explicitly
    localStorage.removeItem("safeshee_user");
    localStorage.removeItem("safeshee_token");
    localStorage.clear(); // Poora storage saaf kar do safety ke liye

    // 3. 🚀 Hard Reload to clear React Memory & Map Layers
    // Iske bina purane police user ka data map par reh jata hai
    window.location.href = "/login";
  }

  const value = { user, token, register, login, logout, isLoading, error };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
