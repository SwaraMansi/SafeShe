# Windows
.\deploy-prepare.ps1

# macOS/Linux
bash deploy-prepare.sh# SafeSHEE Heroku + Netlify Deployment Guide

## Overview
This guide covers deploying the safeSHEE application:
- **Backend**: Node.js + Express on **Heroku**
- **Frontend**: React on **Netlify**
- **Database**: PostgreSQL (Heroku Postgres)

---

## Prerequisites

### Required Accounts
- [Heroku Account](https://www.heroku.com) (free tier available)
- [Netlify Account](https://www.netlify.com) (free tier available)
- [GitHub Account](https://github.com) (recommended for easy deployments)
- [Twilio Account](https://www.twilio.com) (optional, for SMS features)

### Required Tools
```bash
# Install Heroku CLI
# Windows: Download from https://devcenter.heroku.com/articles/heroku-cli
# Or: choco install heroku-cli

# Install Node.js (v18+)
# Verify installation
node --version
npm --version
```

---

## Part 1: Prepare Your Code

### 1.1 Create `.env.local` in Backend

```bash
cd backend
```

Create `.env.local` file:
```
PORT=5000
NODE_ENV=development
DATABASE_URL=sqlite:///:memory:
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_dev_secret_key
```

### 1.2 Create `.env.local` in Frontend

```bash
cd ../frontend
```

Create `.env.local` file:
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
```

### 1.3 Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 1.4 Test Locally

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

---

## Part 2: Deploy Backend to Heroku

### 2.1 Login to Heroku

```bash
heroku login
```

This will open your browser to authenticate.

### 2.2 Create Heroku App

```bash
cd backend

# Create new app (replace YOUR_APP_NAME with your desired name)
heroku create your-safeshee-backend --region us

# Verify app created
heroku apps:info
```

### 2.3 Add PostgreSQL Database

```bash
# Add Postgres add-on (free tier: hobby-dev)
heroku addons:create heroku-postgresql:hobby-dev --app your-safeshee-backend

# Check database URL was set
heroku config --app your-safeshee-backend

# You should see: DATABASE_URL=postgres://...
```

### 2.4 Set Environment Variables

```bash
heroku config:set NODE_ENV=production --app your-safeshee-backend
heroku config:set JWT_SECRET=your_production_secret_key_change_this --app your-safeshee-backend
heroku config:set FRONTEND_URL=https://your-app-name.netlify.app --app your-safeshee-backend

# For Twilio (if using SMS features)
heroku config:set TWILIO_ACCOUNT_ID=your_twilio_account_id --app your-safeshee-backend
heroku config:set TWILIO_AUTH_TOKEN=your_twilio_auth_token --app your-safeshee-backend
heroku config:set TWILIO_PHONE_NUMBER=+1234567890 --app your-safeshee-backend

# View all config
heroku config --app your-safeshee-backend
```

### 2.5 Deploy Backend

**Option A: Direct Git Push (Recommended)**

```bash
# Add Heroku as remote
git remote add heroku https://git.heroku.com/your-safeshee-backend.git

# Deploy
git push heroku main

# Or if you're on master branch:
git push heroku master
```

**Option B: Manual Deploy**

```bash
# Create Heroku app linked to GitHub (via web dashboard)
# Then just push to GitHub and let Heroku auto-deploy
```

### 2.6 Monitor Backend Deployment

```bash
# View logs
heroku logs --app your-safeshee-backend --tail

# Run migrations/initialization (if needed)
heroku run node database.js --app your-safeshee-backend

# Test backend health
curl https://your-safeshee-backend.herokuapp.com/ping
# Expected response: {"message":"pong"}
```

### 2.7 Get Backend URL

```bash
heroku info --app your-safeshee-backend
# Look for "Web URL: https://your-safeshee-backend.herokuapp.com"
```

**Save this URL** - you'll need it for frontend deployment.

---

## Part 3: Deploy Frontend to Netlify

### 3.1 Build React App

```bash
cd frontend

# Create .env file for production
echo "REACT_APP_API_URL=https://your-safeshee-backend.herokuapp.com" > .env.production
echo "REACT_APP_WS_URL=wss://your-safeshee-backend.herokuapp.com" >> .env.production

# Build
npm run build
```

### 3.2 Connect to Netlify

**Option A: Via GitHub (Recommended - Auto-Deploy)**

1. Push your code to GitHub:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. In [Netlify Dashboard](https://app.netlify.com):
   - Click "New site from Git"
   - Select "GitHub"
   - Choose your repository
   - Set build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `build`
     - **Base directory**: `frontend`
   - Before deploying, add environment variable:
     - **Key**: `REACT_APP_API_URL`
     - **Value**: `https://your-safeshee-backend.herokuapp.com`
     - **Key**: `REACT_APP_WS_URL`
     - **Value**: `wss://your-safeshee-backend.herokuapp.com`
   - Deploy site

**Option B: Via Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
netlify deploy --prod --dir=build
```

### 3.3 Configure Netlify

1. Go to Netlify Dashboard > Site Settings
2. **Build & Deploy**:
   - Build command: `npm run build`
   - Publish directory: `build`
3. **Environment**:
   - Add `REACT_APP_API_URL`
   - Add `REACT_APP_WS_URL`

---

## Part 4: Update Heroku Backend for Frontend Origin

Once you have your Netlify URL (e.g., `https://your-app.netlify.app`):

```bash
# Update CORS and frontend URL
heroku config:set FRONTEND_URL=https://your-app.netlify.app --app your-safeshee-backend

# Restart app
heroku restart --app your-safeshee-backend
```

---

## Part 5: Test Deployment

### Backend Health Check
```bash
curl https://your-safeshee-backend.herokuapp.com/ping
```

### Frontend Access
```bash
# Visit your Netlify URL
https://your-app-name.netlify.app
```

### Test Full Flow
1. Register a new user
2. Login
3. Trigger SOS alert
4. Check Police Dashboard
5. View Analytics

---

## Troubleshooting

### Backend Issues

**App crashes on deploy:**
```bash
# Check logs
heroku logs --app your-safeshee-backend --tail

# Check buildpack
heroku buildpacks --app your-safeshee-backend
# Should show: heroku/nodejs
```

**Database connection error:**
```bash
# Check database URL
heroku config --app your-safeshee-backend | grep DATABASE_URL

# Verify tables created
heroku psql --app your-safeshee-backend
# Then: \dt
```

**WebSocket connection fails:**
- Make sure FRONTEND_URL is set correctly
- Check CORS settings in server.js

### Frontend Issues

**API calls failing:**
- Check browser console for CORS errors
- Verify REACT_APP_API_URL in Netlify environment
- Make sure backend is running: `heroku ps --app your-safeshee-backend`

**WebSocket connection timeout:**
- Verify WS endpoint format: `wss://` (not `ws://`) for production
- Check firewall/network settings

---

## Managing Deployments

### Push Updates to Backend
```bash
cd backend
git add .
git commit -m "Your message"
git push heroku main
```

### Push Updates to Frontend
```bash
cd frontend
git add .
git commit -m "Your message"
git push origin main
# Netlify auto-deploys on any push to main
```

### Scale Dynos (Backend)
```bash
# Standard tier for better performance
heroku dyno:type Standard-1X --app your-safeshee-backend

# View dyno info
heroku ps --app your-safeshee-backend
```

### View Costs
```bash
# Heroku
heroku billing --app your-safeshee-backend

# Or visit Heroku Dashboard > Account Settings > Billing
```

---

## Database Backup

### Backup PostgreSQL
```bash
heroku pg:backups:capture --app your-safeshee-backend
heroku pg:backups:download --app your-safeshee-backend
```

### Restore Database
```bash
# Get backup ID
heroku pg:backups --app your-safeshee-backend

# Restore
heroku pg:backups:restore backup-id --app your-safeshee-backend --confirm your-safeshee-backend
```

---

## Environment Variables Reference

### Backend (.env)
| Variable | Example | Notes |
|----------|---------|-------|
| `PORT` | 5000 | Auto-set by Heroku |
| `NODE_ENV` | production | |
| `DATABASE_URL` | postgres://... | Auto-set by Heroku |
| `FRONTEND_URL` | https://app.netlify.app | For CORS |
| `JWT_SECRET` | long_random_string | Change in production |
| `TWILIO_ACCOUNT_ID` | ACxxxxxxx | Optional |
| `TWILIO_AUTH_TOKEN` | your_token | Optional |
| `TWILIO_PHONE_NUMBER` | +1234567890 | Optional |

### Frontend (.env)
| Variable | Example | Notes |
|----------|---------|-------|
| `REACT_APP_API_URL` | https://your-backend.herokuapp.com | |
| `REACT_APP_WS_URL` | wss://your-backend.herokuapp.com | Note: wss not ws |

---

## Monitoring & Logging

### View Backend Logs
```bash
heroku logs --app your-safeshee-backend --tail
heroku logs --app your-safeshee-backend --tail -n 1000  # Last 1000 lines
```

### View Error Logs Only
```bash
heroku logs --app your-safeshee-backend --tail --source app --dyno web
```

---

## Cost Estimate (as of 2024)

### Free Tier
- **Heroku**: 5 free dynos (may require credit card)
- **Netlify**: Free hosting + auto-deployments


### Recommended (Production)
- **Heroku**: Standard-1X dyno (~$7/month)
- **Netlify**: Pro plan (~$19/month) - optional

---

## Next Steps

1. ✅ Deploy backend to Heroku
2. ✅ Deploy frontend to Netlify
3. 📊 Set up monitoring/alerts
4. 🔒 Enable SSL (auto on Netlify/Heroku)
5. 📈 Monitor usage and scale as needed

---

**Need help?** Check Heroku Docs: https://devcenter.heroku.com
