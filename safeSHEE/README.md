# safeSHEE

Full-stack women safety SOS platform with real-time emergency alerts, police dashboard, incident reporting, and risk-based prioritization.

**Tech Stack:**
- Frontend: React + Leaflet.js + React Router
- Backend: Node.js + Express + SQLite
- Maps: OpenStreetMap via Leaflet
- Authentication: JWT-based

**Ports:**
- Backend: 5000
- Frontend: 3000

---

## Features

### User Dashboard
- **SOS Button**: One-tap emergency alert with geolocation
- **Live Location Tracking**: Automatic position updates every 5 seconds while active
- **Live Map**: Real-time location visualization with movement path
- **Status Indicator**: Safe / SOS Active display
- **Emergency Contacts**: Manage and recall contacts quickly

### Real-Time Alert System
- **WebSocket Live Updates**: Instant alert notifications (no polling)
- **Automatic Status Sync**: All users see updates in real-time
- **Location Streaming**: Live GPS path visualization
- **Alert Status Change**: Broadcast responding/resolved status instantly

### SMS Notifications (via Twilio)
- **Real SMS**: Send alerts to emergency contacts via real Twilio SMS
- **Mock Mode**: Fallback mock SMS for development (no Twilio account needed)
- **Alert Notifications**: Automatic SMS when SOS triggered
- **Status Updates**: Notify contacts when alert status changes

### Report Incident
- Multiple complaint types (Harassment, Stalking, Domestic Violence, Unsafe Area, Suspicious Activity)
- Image upload (frontend preview)
- Anonymous submission option
- Auto-attach location data

### Police Dashboard
- View all active/resolved SOS alerts
- Filter by status and risk level
- Mark alerts "Responding" or "Resolved"
- Risk-based prioritization (calculated from time, status, etc.)
- Map visualization of all active cases
- User details (name, email, coordinates, timestamp)

### Risk Scoring System
- Dynamic risk calculation (0–100)
- Color-coded alerts: Green (Low), Yellow (Medium), Red (High)
- HIGH RISK ALERT banner for scores > 70

### Authentication
- User registration with name, email, password
- JWT login system
- Role-based access:
  - `user`: Dashboard, Report, Contacts
  - `admin`: Admin Dashboard
  - `police`: Police Dashboard (use email `police@safe.com`)

---

## Setup Instructions

### 1. Backend

```bash
cd safeSHEE/backend
npm install
npm start
```

Backend runs on `http://localhost:5000`

**API Endpoints:**
- `GET /ping` → Health check
- `POST /auth/register` → Register new user
- `POST /auth/login` → Login
- `POST /sos` → Create SOS alert (protected)
- `POST /sos/update` → Update location (protected)
- `GET /sos` → Get active alerts (protected)
- `GET /sos/all` → Get all alerts (admin only)
- `PATCH /sos/:id/resolve` → Resolve alert (protected)

### 2. Frontend

```bash
cd safeSHEE/frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

---

## Advanced Features Setup

### WebSocket Real-Time Updates

WebSocket is automatically enabled and requires no additional configuration:

```js
// Frontend automatically connects on load
wsService.connect()

// Listen for real-time events
wsService.on('new_alert', (data) => { /* alert added */ })
wsService.on('status_change', (data) => { /* status updated */ })
wsService.on('location_update', (data) => { /* location moved */ })
```

**Benefits:**
- ✅ Instant updates (no polling delay)
- ✅ Reduced server load
- ✅ Less bandwidth usage
- ✅ Automatic reconnection with backoff

### Twilio SMS Integration (Optional)

To enable real SMS notifications:

**1. Create Twilio Account**
- Sign up at https://www.twilio.com
- Verify phone number
- Get credentials from Console

**2. Configure Environment**
```bash
# In backend/ directory, create .env file:
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE=+1234567890
JWT_SECRET=your_jwt_secret
```

**3. Install & Restart**
```bash
cd backend
npm install
npm start
```

**4. Test SMS**
```bash
# Backend logs SMS details
# Or check API endpoint:
curl http://localhost:5000/sos/test/sms-log \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Without Twilio:**
- App uses mock SMS service
- All SMS logged to console
- No external dependencies required
- Perfect for development/testing

---

### Quick Start

1. **Register a User**
   - Go to `http://localhost:3000/register`
   - Email: `testuser@example.com`
   - Password: `password123`
   - Name: `Test User`

2. **Trigger SOS**
   - Go to Dashboard
   - Click the large red **SOS** button
   - Allow location access when prompted
   - Watch your position update every 5 seconds

3. **View as Police (Admin Role)**
   - In an incognito window or new browser:
   - Go to `http://localhost:3000/login`
   - Email: `police@safe.com`
   - Password: `anypassword`
   - Navigate to Police Dashboard
   - See active alerts from all users
   - Mark "Responding" or "Resolved"

4. **Report Incident**
   - From user dashboard, go to "Report"
   - Select incident type
   - Add description
   - Optionally upload image
   - Check "Submit anonymously" to hide identity
   - Submit

5. **Manage Contacts**
   - From dashboard, go to "Contacts"
   - Add emergency contact (name + phone)
   - Mark as primary
   - Edit or delete as needed

---

## File Structure

```
safeSHEE/
├── backend/
│   ├── server.js           # Express server setup
│   ├── database.js         # SQLite initialization
│   ├── routes/
│   │   ├── auth.js         # Login/Register endpoints
│   │   └── sos.js          # SOS alert endpoints
│   ├── middleware/
│   │   └── authMiddleware.js # JWT verification
│   ├── safeshee.db         # SQLite database
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html      # HTML entry
    ├── src/
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Dashboard.js
    │   │   ├── AdminDashboard.js
    │   │   ├── PoliceDashboard.js
    │   │   ├── ReportIncident.js
    │   │   └── Contacts.js
    │   ├── components/
    │   │   ├── Navbar.js
    │   │   ├── Sidebar.js
    │   │   ├── SOSButton.js
    │   │   ├── LiveMap.js
    │   │   ├── RiskMeter.js
    │   │   ├── AlertCard.js
    │   │   └── ComplaintForm.js
    │   ├── context/
    │   │   └── AuthContext.js
    │   ├── mock/
    │   │   └── mockData.js   # Mock data store
    │   ├── App.js
    │   ├── App.css
    │   └── index.js
    └── package.json
```

---

## Notes

- **Database**: SQLite file (`safeshee.db`) is auto-created on first backend run
- **JWT Secret**: Uses `process.env.JWT_SECRET` or default `'your_jwt_secret'`
- **SMS Service**: Mocked (no real Twilio integration yet)
- **Geolocation**: Requires HTTPS or localhost (browser security)
- **Maps**: Uses OpenStreetMap (no API key required)

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000
# Kill process if needed
taskkill /PID <PID> /F
```

### Frontend shows "No data"
1. Confirm backend is running: `curl http://localhost:5000/ping`
2. Check browser console for errors (F12)
3. Verify you're logged in with valid token
4. Trigger an SOS first to create alert data

### Geolocation denied
- Allow location access in browser permissions
- Use HTTPS or localhost (browsers restrict on HTTP)
- Check browser dev tools > Sensors for mock location

---

## Future Enhancements

- Real Twilio SMS integration
- WebSocket live alerts
- Machine learning risk scoring
- Police department API integration
- Mobile app (React Native)
- Blockchain alert logging
- Audio/video call emergency feature

*Built with ❤️ for women's safety*

