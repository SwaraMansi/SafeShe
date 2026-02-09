# SafeSHEE Deployment Checklist

## ✅ Completed Setup

### Backend Configuration
- [x] Created `Procfile` for Heroku
- [x] Updated `package.json` with Node.js engine requirement
- [x] Updated `database.js` to support PostgreSQL (production) and SQLite (development)
- [x] Added PostgreSQL driver (`pg`) to dependencies
- [x] Configured CORS with environment variable support
- [x] Created `.env.example` with all required variables

### Frontend Configuration
- [x] Created `netlify.toml` for Netlify deployment
- [x] Created API configuration utility (`config/apiConfig.js`)
- [x] Updated `package.json` with Node.js engine requirement
- [x] Created `.env.example` for environment variables

### Project Setup
- [x] Created `.gitignore` for git
- [x] Created comprehensive deployment guide (`HEROKU_NETLIFY_DEPLOYMENT.md`)
- [x] Created deployment preparation scripts (`deploy-prepare.sh` and `.ps1`)

---

## 🚀 Quick Start Deployment

### 1. Prerequisites Installation
```powershell
# Run the Windows setup script
.\deploy-prepare.ps1

# Or on macOS/Linux
bash deploy-prepare.sh
```

### 2. Backend Deployment to Heroku
```bash
cd backend

# Login to Heroku
heroku login

# Create app and add PostgreSQL
heroku create your-safeshee-backend
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set FRONTEND_URL=https://your-app.netlify.app
heroku config:set JWT_SECRET=your_production_secret_key

# Deploy
git push heroku main

# Get your backend URL
heroku info
```

### 3. Frontend Deployment to Netlify
```bash
cd frontend

# Option A: Connect via GitHub (recommended)
# 1. Push to GitHub
# 2. Go to netlify.com
# 3. Click "New site from Git"
# 4. Select repository
# 5. Add env variables:
#    - REACT_APP_API_URL: https://your-safeshee-backend.herokuapp.com
#    - REACT_APP_WS_URL: wss://your-safeshee-backend.herokuapp.com
# 6. Deploy

# Option B: CLI Deploy
npm run build
netlify deploy --prod --dir=build
```

### 4. Test Deployment
- Visit your Netlify URL
- Register a user
- Trigger SOS
- Check Police Dashboard

---

## 📋 Environment Variables

### Backend (.env on Heroku)
```
PORT=5000 (auto-set by Heroku)
NODE_ENV=production
DATABASE_URL=postgres://... (auto-set by Heroku)
FRONTEND_URL=https://your-app.netlify.app
JWT_SECRET=your_secret_key
TWILIO_ACCOUNT_ID=your_id (optional)
TWILIO_AUTH_TOKEN=your_token (optional)
```

### Frontend (.env on Netlify)
```
REACT_APP_API_URL=https://your-backend.herokuapp.com
REACT_APP_WS_URL=wss://your-backend.herokuapp.com
```

---

## 🔧 Configuration Files

### Backend
- **Procfile**: Tells Heroku how to run the app
- **package.json**: Node.js dependencies + scripts
- **database.js**: Database connection (PostgreSQL in production)
- **server.js**: Express app with CORS configuration
- **.env.example**: Template for environment variables

### Frontend
- **netlify.toml**: Netlify build and deployment configuration
- **package.json**: React dependencies + build scripts
- **.env.example**: Template for environment variables
- **src/config/apiConfig.js**: Centralized API URL configuration

---

## 📖 Detailed Documentation

For complete step-by-step instructions, see: `HEROKU_NETLIFY_DEPLOYMENT.md`

Topics covered:
- Prerequisites and tool installation
- Local testing
- Heroku backend deployment
- PostgreSQL setup
- Netlify frontend deployment
- Environment variable configuration
- Troubleshooting
- Monitoring and scaling
- Database backup/restore
- Cost estimation

---

## 🎯 Deployment Path

```
1. Run deploy-prepare.ps1 or .sh
   ↓
2. Test locally (npm run dev + npm start)
   ↓
3. Deploy backend: git push heroku main
   ↓
4. Deploy frontend: Connect GitHub to Netlify
   ↓
5. Test live application
   ↓
6. Monitor and scale as needed
```

---

## ⚠️ Important Notes

1. **SQLite → PostgreSQL**: Your app now uses PostgreSQL in production. SQLite persists locally for development.

2. **WebSocket URLs**: Use `wss://` (secure WebSocket) for production, not `ws://`

3. **CORS Configuration**: Backend now respects FRONTEND_URL environment variable

4. **Free Tier**: Both Heroku and Netlify have free tiers, but with limitations:
   - Heroku: 5 free dynos (may need credit card)
   - Netlify: Unlimited free deployments
   - PostgreSQL: Hobby Dev tier (5MB, free)

5. **Database URL**: Heroku automatically adds `DATABASE_URL` when you add Postgres addon

---

## 🆘 Common Issues

**Problem**: Backend crashes on Heroku
**Solution**: Run `heroku logs --app your-safeshee-backend --tail`

**Problem**: Frontend can't reach API
**Solution**: Check REACT_APP_API_URL matches backend URL

**Problem**: WebSocket connection fails
**Solution**: Use `wss://` for production (secure protocol)

**Problem**: Database queries failing
**Solution**: Verify DATABASE_URL and run migrations: `heroku psql`

---

## 📞 Support

- Heroku Docs: https://devcenter.heroku.com
- Netlify Docs: https://docs.netlify.com
- Postgres Documentation: https://www.postgresql.org/docs/

---

**Status**: Ready for deployment! ✨
