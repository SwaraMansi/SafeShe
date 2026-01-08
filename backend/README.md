# backend

[![CI](https://github.com/<OWNER>/<REPO>/actions/workflows/ci.yml/badge.svg)](https://github.com/<OWNER>/<REPO>/actions/workflows/ci.yml)

How to run locally:

1. Create a `.env` file in `backend/` with at least:

```
MONGO_URI=mongodb://localhost:27017/safeshee
JWT_SECRET=your_jwt_secret
```

2. Install dependencies:

```
cd backend
npm install
```

3. Start the server (development):

```
npm start
```

Deployment (quick)

- Frontend: this repo includes a GitHub Actions workflow that builds the frontend and deploys `frontend/build` to GitHub Pages. Set `frontend/homepage` in `frontend/package.json` to `https://<OWNER>.github.io/<REPO>` (replace placeholders) before pushing to `main`.

- Backend: the deploy workflow can deploy to Heroku. Create a Heroku app and add the following repository secrets:
  - `HEROKU_API_KEY` (your Heroku API key)
  - `HEROKU_APP_NAME` (the app name)
  - `HEROKU_EMAIL` (your Heroku account email)

The workflow will run on push to `main` and deploy the frontend to GitHub Pages and the backend to Heroku.

Development & tests

- Start in dev mode (auto-reload): `npm run dev` (requires `nodemon`).
- Run smoke tests after starting the server: `npm run smoke` — this hits `/ping` and `/api/report/sos` and exits non-zero on failure.
- Run unit tests and integration tests: `npm test` (uses `jest`).

Note: Update `<OWNER>` and `<REPO>` in the badge URL above to your GitHub org/repo, and set the Heroku secrets in repo settings before allowing deploys.