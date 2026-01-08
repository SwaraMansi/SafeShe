# Contributing to SafeSHEE

## Local Development

### Setup
```bash
# Backend
cd backend
npm install
# Create .env
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm start
```

### Running Tests
```bash
# Backend: unit + integration tests
cd backend
npm test

# Frontend: component tests
cd frontend
npm test -- --watchAll=false
```

### Smoke Tests
```bash
cd backend
npm run smoke
```

## Code Style
- Use ES6+ syntax
- Keep functions small and testable
- Add comments for non-obvious logic

## Pull Requests
1. Create a feature branch: `git checkout -b feat/your-feature`
2. Commit changes: `git commit -m "feat: description"`
3. Push to GitHub: `git push origin feat/your-feature`
4. Open a pull request on GitHub
5. Wait for CI (tests + linting) to pass
6. Request review from maintainers

## Reporting Issues
Use GitHub Issues and provide:
- Clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots (if applicable)
