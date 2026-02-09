# 🚨 safeSHEE – AI-Powered Women Safety & Incident Management Platform

## 🌍 Overview

**safeSHEE** is a full-stack AI-driven safety platform designed to enhance women’s safety through proactive detection, intelligent escalation, and police-side prioritization.

The system integrates:

- 📍 Real-time location tracking
- 🔴 Red zone geo-fencing
- 🎤 AI voice distress detection
- 📱 Panic gesture detection
- 📩 Emergency contact escalation
- 👮 Police analytics & risk prioritization
- 🧠 ML-based risk prediction
- 🗺 Incident heatmaps

This platform combines preventive, reactive, and predictive safety mechanisms into a single intelligent ecosystem.

---

## 🧠 Core Architecture

### 👤 User Layer

- SOS Trigger  
- Red Zone Detection  
- Voice Distress AI  
- Safety Mode (live tracking)  
- Quick Dial Contacts  
- Offline SMS Fallback  

### 👮 Police Layer

- Live Incident Dashboard  
- AI Risk Scoring  
- Priority Queue Engine  
- Heatmap Visualization  
- Analytics Dashboard  

### 🤖 Intelligence Layer

- Machine Learning Risk Prediction  
- Dynamic Case Prioritization  
- Geo-cluster Risk Calculation  

---

## 🚀 Key Features

### 🔴 Red Zone Geo-Fencing

Detects when a user enters high-risk areas based on historical incident density and AI risk scoring.

- Real-time monitoring via `watchPosition()`
- Browser notifications
- Optional emergency contact notification
- Cooldown system to prevent alert spam

---

### 🎤 AI Voice Distress Detection

Continuously listens (when enabled) for distress keywords such as:

- “help”
- “stop”
- “danger”

When triggered:

- Silent SOS is activated  
- Location is captured  
- Report is generated  
- Primary contact is notified  

---

### 📱 Panic Gesture Detection

Detects rapid device shake patterns using the DeviceMotion API and triggers silent emergency alerts.

---

### 📸 Auto Evidence Capture

When SOS is triggered:

- Camera snapshot is captured  
- Image is attached to report  
- Stored securely in backend  

---

### 📍 Smart Safety Mode

- Shares live location every 10 seconds  
- Detects inactivity  
- Prompts safety confirmation  
- Escalates if no response  

---

### 🧠 ML-Based Risk Prediction

Dynamic risk scoring based on:

- Incident category  
- Time of day  
- Area density  
- Time unresolved  
- Historical patterns  

Police dashboard automatically prioritizes:

- Critical  
- High  
- Medium  
- Low  

---

### 🗺 Heatmap Visualization

- Displays incident clusters  
- Weighted by predicted risk score  
- Toggle between markers and heatmap  
- Top unsafe zones panel  

---

### 📊 Police Analytics Dashboard

- Total incidents  
- Active vs resolved  
- Category distribution  
- Risk distribution  
- 7-day trends  
- Average response time  

---

### 📵 Offline SMS Fallback

If internet is unavailable:

- Automatically opens SMS intent  
- Prefills Google Maps location  
- Notifies primary contact  

---

## 🏗 Tech Stack

### Frontend

- React.js  
- React Router  
- Leaflet.js  
- Chart.js / Recharts  
- Web Speech API  
- DeviceMotion API  
- Notification API  

### Backend

- Node.js  
- Express.js  
- JWT Authentication  
- SQLite / SQL-based storage  
- REST APIs  
- WebSocket (optional)  

---

## 🔐 Security

- JWT-based authentication  
- Role-based access (User / Police)  
- Protected API routes  
- Controlled escalation settings  
- Cooldown protection to prevent spam  

---

## 🎯 Hackathon Value Proposition

**safeSHEE is not just an SOS app.**

It introduces a layered safety framework:

### 🔵 Preventive
- Red zone detection  
- AI-powered risk awareness  

### 🟡 Reactive
- Voice-triggered emergency alerts  
- Panic gesture detection  
- Smart Safety Mode with live tracking  

### 🔴 Predictive
- ML-based case prioritization  
- Real-time incident heatmaps  

This ensures both **user-level safety** and **intelligent police-side decision making**.

---

## 📈 Future Enhancements

- Native mobile application  
- Real-time police dispatch integration  
- Wearable hardware API integration  
- Advanced ML training pipeline  
- Cloud-based persistent storage  
- Encrypted evidence vault  
