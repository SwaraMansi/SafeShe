# safeSHEE Deployment & Testing Guide

## Quick Test Flow

### Prerequisites
- Backend running on port 5000
- Frontend running on port 3000
- Node.js 14+

---

## Step 1: Register a User

**Via Frontend:**
1. Go to http://localhost:3000/register
2. Fill in:
   - Name: `Alice Johnson`
   - Email: `alice@example.com`
   - Password: `test123`
3. Click Register
4. You'll be redirected to Dashboard

**Via Backend API (curl):**
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "test123"
  }'
```

---

## Step 2: Trigger an SOS Alert

**Via Frontend:**
1. On Dashboard, click the large red **SOS** button
2. Grant location permission when asked
3. Status should change to "SOS Active"
4. You'll see coordinates displayed
5. Position updates every 5 seconds (automatic watchPosition)
6. Click "Stop SOS" when done

**Console logs:**
- Open DevTools (F12) > Console
- You should see location updates and map position changes

---

## Step 3: View in Police Dashboard

**Register as Police:**
1. Open new incognito window / different browser
2. Go to http://localhost:3000/register
3. Email: `police@safe.com` (triggers police role)
4. Password: `any`
5. Name: `Officer`
6. Click Register

**Or Login as Police:**
1. Go to http://localhost:3000/login
2. Email: `police@safe.com`
3. Password: `anypassword`

**View Alerts:**
1. From navigation, go to "Police" Dashboard
2. You should see:
   - Map with active alert markers
   - "Cases" list showing:
     - User name: Alice Johnson
     - Email: alice@example.com
     - Location: latitude, longitude
     - Timestamp: when alert was triggered
     - Risk score (green/yellow/red)
     - Buttons: "Responding" and "Resolve"
3. Click "Responding" to change alert status
4. Click "Resolve" to mark complete

---

## Step 4: Test Error Handling

**No alerts:**
- Police Dashboard shows: "No active alerts yet"
- Placeholder card with icon

**Network failure:**
- If backend is down, error banner shows
- Check console for error details

**401 Unauthorized:**
- If token is invalid/expired
- Error message: "Unauthorized: Invalid token"

---

## Step 5: Report Incident

1. From user Dashboard, click "Report"
2. Select incident type: e.g., "Harassment"
3. Add description: "Uncomfortable staring at station"
4. Optional: Upload an image
5. Check "Submit anonymously" to hide identity
6. Click "Submit Complaint"
7. Success message appears "Submitted ✓"

---

## Step 6: Manage Emergency Contacts

1. From Dashboard, click "Contacts"
2. Add contact:
   - Name: "Mom"
   - Phone: "+911234567890"
   - Check "Primary"
   - Click "Save"
3. View saved contacts below
4. Edit contact: Click "Edit" button
5. Delete contact: Click "Delete" button

---

## API Verification

### Test /ping Endpoint
```bash
curl http://localhost:5000/ping
# Expected: {"message":"pong"}
```

### Get Active SOS Alerts
```bash
TOKEN="your-jwt-token-here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/sos
# Expected: {"alerts":[{...}]}
```

### Create SOS Alert
```bash
TOKEN="your-jwt-token-here"
curl -X POST http://localhost:5000/sos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.7041,
    "longitude": 77.1025,
    "timestamp": '$(date +%s000)'
  }'
```

### Update Alert Location
```bash
TOKEN="your-jwt-token-here"
ALERT_ID=1
curl -X POST http://localhost:5000/sos/update \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alertId": '$ALERT_ID',
    "latitude": 28.7042,
    "longitude": 77.1026,
    "timestamp": '$(date +%s000)'
  }'
```

### Resolve Alert
```bash
TOKEN="your-jwt-token-here"
ALERT_ID=1
curl -X PATCH http://localhost:5000/sos/$ALERT_ID/resolve \
  -H "Authorization: Bearer $TOKEN"
```

---

## Database Inspection

### View SQLite Database
```bash
cd safeSHEE/backend
sqlite3 safeshee.db

# Inside SQLite:
.schema                    # Show all tables
SELECT * FROM users;       # View users
SELECT * FROM sos_alerts;  # View SOS alerts
SELECT * FROM sos_locations; # View tracking path
.quit                      # Exit
```

### Reset Database
```bash
rm safeSHEE/backend/safeshee.db
# Backend will recreate on next start
```

---

## Performance Monitoring

**Frontend Console Logs:**
- Open DevTools (F12)
- Go to Console tab
- Look for "Police dashboard alerts: [...]"
- Check for network errors or geolocation denials

**Backend Console:**
- Watch for SQL errors
- Check JWT verification logs

---

## Troubleshooting Checklist

- [ ] Backend running on 5000? (`curl http://localhost:5000/ping`)
- [ ] Frontend running on 3000? (open http://localhost:3000)
- [ ] User registered with valid credentials?
- [ ] Token stored in localStorage? (DevTools > Application > localStorage > safeshee_token)
- [ ] Geolocation permission granted?
- [ ] Browser not blocking mixed content (HTTP/HTTPS)?
- [ ] Database file exists? (`ls -la safeSHEE/backend/safeshee.db`)

---

## Role-Based Access

| Route | User | Police | Admin |
|-------|------|--------|-------|
| /dashboard | ✓ | ✓ | ✓ |
| /report | ✓ | ✓ | ✓ |
| /contacts | ✓ | ✓ | ✓ |
| /police | ✗ | ✓ | ✗ |
| /admin | ✗ | ✗ | ✓ |

---

## Next Steps

1. **Real SMS Integration**: Replace mock SMS with Twilio API
2. **WebSocket Updates**: Real-time alerts without polling
3. **Advanced Risk Scoring**: ML-based risk calculation
4. **Offline Mode**: Service worker for offline reports
5. **Push Notifications**: Native notifications for police
6. **Encryption**: End-to-end encrypted communications

---

*For questions or issues, check browser console (F12) and backend terminal for error logs.*
