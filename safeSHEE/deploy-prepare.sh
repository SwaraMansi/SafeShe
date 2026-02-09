#!/bin/bash
# SafeSHEE Deployment Script
# This script helps prepare your application for Heroku + Netlify deployment

echo "🚀 SafeSHEE Deployment Prepare"
echo "================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "✅ npm $(npm --version)"

# Check git
if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install from https://git-scm.com"
    exit 1
fi
echo "✅ Git $(git --version)"

# Check Heroku CLI
if ! command -v heroku &> /dev/null; then
    echo "⚠️  Heroku CLI not found. Installing..."
    # For automatic installation, this would vary by OS
    echo "   Download from: https://devcenter.heroku.com/articles/heroku-cli"
else
    echo "✅ Heroku CLI installed"
fi

echo ""
echo "📦 Installing dependencies..."
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
echo "✅ Dependencies installed"

echo ""
echo "🔧 Creating environment files..."

# Backend .env.local
if [ ! -f backend/.env.local ]; then
    cat > backend/.env.local << 'EOF'
PORT=5000
NODE_ENV=development
DATABASE_URL=sqlite:///:memory:
FRONTEND_URL=http://localhost:3000
JWT_SECRET=dev_secret_key_change_in_production
EOF
    echo "✅ Created backend/.env.local"
else
    echo "⏭️  backend/.env.local already exists"
fi

# Frontend .env.local
if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << 'EOF'
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
EOF
    echo "✅ Created frontend/.env.local"
else
    echo "⏭️  frontend/.env.local already exists"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Test locally: npm run dev (backend) and npm start (frontend)"
echo "2. Read HEROKU_NETLIFY_DEPLOYMENT.md for deployment instructions"
echo "3. Set up Heroku app: heroku create your-safeshee-backend"
echo "4. Connect Netlify to your GitHub repository"
echo ""
echo "📖 Detailed guide: HEROKU_NETLIFY_DEPLOYMENT.md"
