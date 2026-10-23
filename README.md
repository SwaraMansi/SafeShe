# 🛡️ SafeShe – AI-Powered Women's Safety & Incident Management Platform

[![Deployments](https://img.shields.io/badge/Deployments-GitHub%20Pages-brightgreen)](https://swaramansi.github.io/SafeShe/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-90.5%25-yellow)](https://github.com/SwaraMansi/SafeShe)

> **SafeShe** is a full-stack, AI-driven safety ecosystem designed to bridge the gap between instant victim assistance and real-time emergency responder prioritization. By combining preventive geofencing, reactive distress detection, and predictive analytics, SafeShe empowers users and enables authorities to act faster.

---

## 🌟 Key Features & Functional Modules

### 👤 User Safety Layer (Client Side)
* 🔴 **Red Zone Geo-Fencing:** Tracks user location using `watchPosition()` to issue real-time warnings upon entering high-risk areas identified by historical incident data.
* 🎤 **AI Voice Distress Detection:** Continuously listens for emergency trigger words (e.g., *"help"*, *"stop"*, *"danger"*) via the Web Speech API to initiate silent SOS alerts.
* 📱 **Panic Gesture Detection:** Uses device acceleration and movement via the `DeviceMotion API` to detect rapid shake gestures for instant, hands-free distress signals.
* 📸 **Auto-Evidence Capture:** Automatically captures camera snapshots when an SOS is triggered and attaches them securely to the emergency incident log.
* 📍 **Smart Safety Mode:** Periodically shares live location coordinates every 10 seconds, checks in on user activity, and escalates to emergency contacts if unattended.
* 📵 **Offline SMS Fallback:** Automatically generates pre-filled SMS messages containing Google Maps coordinates if internet connectivity drops.

### 👮 Responder & Police Analytics Layer (Dashboard Side)
* 📊 **Live Incident Dashboard:** Monitors incoming alerts, categorizes active vs. resolved cases, and provides real-time response trends.
* 🗺️ **Interactive Heatmaps:** visualizes high-risk zones using interactive mapping libraries (`Leaflet.js`) weighted by AI/ML risk scoring.
* 🧠 **ML-Based Risk Prioritization:** Dynamically ranks incidents into **Critical**, **High**, **Medium**, and **Low** priorities using factors like area density, unresolved duration, and category severity.

---

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React.js, React Router, Leaflet.js, Chart.js / Recharts, Web Speech API, DeviceMotion API |
| **Backend** | Node.js, Express.js, JWT Authentication, WebSockets |
| **Database** | SQLite / SQL-based storage |

---

## 🚀 Deployment

### Live Demo
The web application is deployed and accessible on GitHub Pages:
👉 **[Live Application Page](https://swaramansi.github.io/SafeShe/)**

---

### 💻 Local Installation & Setup

#### Prerequisites
* Node.js (v16.0 or higher)
* npm or yarn

#### 1. Clone the Repository
```bash
git clone [https://github.com/SwaraMansi/SafeShe.git](https://github.com/SwaraMansi/SafeShe.git)
cd SafeShe
