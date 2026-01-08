# SafeSHEE – Women Safety Platform

A full-stack web app for women to report harassment incidents with AI-powered risk scoring, geolocation sharing, and SOS alerts.

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- MongoDB (local instance or Atlas URI)

### Backend
```bash
cd backend
npm install
# Create .env with:
# MONGO_URI=mongodb://localhost:27017/safeshee
# JWT_SECRET=your_secret
npm start
# Server runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm start
# App runs on http://localhost:3000
# (proxy forwards /api requests to http://localhost:5000)
```

Test the app:
- Visit http://localhost:3000
- Click "Send SOS" (requests geolocation + posts to /api/report/sos)
- Fill in "Report Incident" form (optional location sharing) and submit
- View reports in "Police Dashboard"

## Deploy (GitHub + Heroku)

### 1. Push to GitHub
```bash
git add -A
git commit -m "Initial commit: SafeSHEE full-stack app"
git remote add origin https://github.com/<OWNER>/<REPO>.git
git push -u origin main
```

### 2. Frontend → GitHub Pages
Update `frontend/package.json`:
```json
"homepage": "https://<OWNER>.github.io/<REPO>"
```
Push to `main` → GitHub Actions automatically deploys to GitHub Pages.

### 3. Backend → Heroku
1. Create Heroku app: `heroku create <app-name>`
2. Set environment variables on Heroku:
   ```bash
   heroku config:set MONGO_URI=<your_mongodb_uri>
   heroku config:set JWT_SECRET=<your_secret>
   ```
3. Add repo secrets in GitHub (Settings → Secrets):
   - `HEROKU_API_KEY` (get from `heroku authorizations:create`)
   - `HEROKU_APP_NAME` (your Heroku app name)
   - `HEROKU_EMAIL` (your Heroku email)
4. Push to `main` → GitHub Actions deploys backend to Heroku.

## Features

✅ **Report Incidents**: Describe incidents with optional geolocation sharing  
✅ **Risk Scoring**: AI-powered classification (Sexual Assault, Stalking, Verbal Abuse, Other) with context-aware risk (1–10)  
✅ **SOS Button**: One-click emergency alert with automatic geolocation  
✅ **Location Tracking**: Store location pings for incident response  
✅ **Auth**: User registration and login with JWT tokens  
✅ **Dashboard**: View all reports and risk scores  
✅ **Tests**: Unit + integration tests for backend; unit tests for frontend  
✅ **CI/CD**: GitHub Actions for automated testing and deployment  

## Project Structure

```
safeSHEE/
├── backend/
│   ├── models/          # Mongoose schemas (User, Report, Location)
│   ├── routes/          # Express routes (auth, report)
│   ├── middleware/      # JWT auth middleware
│   ├── utils/           # Risk scoring + AI classification
│   ├── tests/           # Integration tests (auth, SOS)
│   ├── server.js        # Express entry point
│   ├── package.json
│   └── Procfile         # Heroku config
├── frontend/
│   ├── src/
│   │   ├── api.js       # Fetch wrapper for API calls
│   │   ├── App.js       # Main component (SOS + Report + Dashboard)
│   │   ├── SOSButton.js # One-click SOS with geolocation
│   │   ├── ReportForm.js # Incident reporting form
│   │   ├── Dashboard.js # View all reports + risk
│   │   └── __tests__/   # React component tests
│   ├── package.json
│   └── public/
├── .github/workflows/
│   ├── ci.yml           # Run tests on push/PR
│   └── deploy.yml       # Deploy to GitHub Pages + Heroku
└── README.md            # This file
```

## API Endpoints

### Auth
- `POST /api/auth/register` – Register new user
- `POST /api/auth/login` – Login (returns JWT token)

### Reports
- `POST /api/report` – Create incident report (with optional location)
- `GET /api/report` – List all reports
- `POST /api/report/sos` – Send SOS alert (with geolocation)
- `POST /api/report/location` – Log location ping

### Health
- `GET /ping` – Health check

## Tech Stack

**Backend**: Node.js, Express, Mongoose, JWT, bcryptjs  
**Frontend**: React 19, Fetch API, Testing Library  
**Database**: MongoDB  
**Testing**: Jest (backend), React Testing Library (frontend)  
**DevOps**: GitHub Actions, Heroku, GitHub Pages  

## Next Steps (Future)

- [ ] Real-time notifications (Socket.IO)
- [ ] Improvement in SOS UX (confirmation modal, hold-to-send, sound)
- [ ] Map visualization of incidents (Google Maps)
- [ ] Community safety ratings
- [ ] Mobile app (React Native)
- [ ] Police officer dashboard with real-time alerts

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup and contribution guidelines.

## License

MIT
