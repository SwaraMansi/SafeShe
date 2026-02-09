# SafeSHEE Deployment Script for Windows
# This script helps prepare your application for Heroku + Netlify deployment

Write-Host "🚀 SafeSHEE Deployment Prepare" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion"
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm $npmVersion"
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

# Check git
try {
    $gitVersion = git --version
    Write-Host "✅ Git installed"
} catch {
    Write-Host "❌ Git not found. Please install from https://git-scm.com" -ForegroundColor Red
    exit 1
}

# Check Heroku CLI
try {
    $herokuVersion = heroku --version
    Write-Host "✅ Heroku CLI installed"
} catch {
    Write-Host "⚠️  Heroku CLI not found." -ForegroundColor Yellow
    Write-Host "   Download from: https://devcenter.heroku.com/articles/heroku-cli" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan

# Backend dependencies
Write-Host "Installing backend dependencies..."
Push-Location backend
npm install
Pop-Location
Write-Host "✅ Backend dependencies installed"

# Frontend dependencies
Write-Host "Installing frontend dependencies..."
Push-Location frontend
npm install
Pop-Location
Write-Host "✅ Frontend dependencies installed"

Write-Host ""
Write-Host "🔧 Creating environment files..." -ForegroundColor Cyan

# Backend .env.local
$backendEnvPath = "backend\.env.local"
if (-not (Test-Path $backendEnvPath)) {
    @"
PORT=5000
NODE_ENV=development
DATABASE_URL=sqlite:///:memory:
FRONTEND_URL=http://localhost:3000
JWT_SECRET=dev_secret_key_change_in_production
"@ | Set-Content $backendEnvPath
    Write-Host "✅ Created backend\.env.local"
} else {
    Write-Host "⏭️  backend\.env.local already exists"
}

# Frontend .env.local
$frontendEnvPath = "frontend\.env.local"
if (-not (Test-Path $frontendEnvPath)) {
    @"
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
"@ | Set-Content $frontendEnvPath
    Write-Host "✅ Created frontend\.env.local"
} else {
    Write-Host "⏭️  frontend\.env.local already exists"
}

Write-Host ""
Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Yellow
Write-Host "1. Test locally: npm run dev (backend) and npm start (frontend)"
Write-Host "2. Read HEROKU_NETLIFY_DEPLOYMENT.md for deployment instructions"
Write-Host "3. Set up Heroku app: heroku create your-safeshee-backend"
Write-Host "4. Connect Netlify to your GitHub repository"
Write-Host ""
Write-Host "📖 Detailed guide: HEROKU_NETLIFY_DEPLOYMENT.md" -ForegroundColor Cyan
