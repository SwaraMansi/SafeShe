# GitHub Copilot / AI Agent Instructions for safeSHEE

Summary
- Full-stack app: React (frontend/) + Express + Mongoose (backend/).
- Frontend: Create React App in `frontend/` (run `npm start` there).
- Backend: lightweight Express server at `backend/server.js`; models under `backend/models`, routes under `backend/routes` and a small AI helper in `backend/utils/aiEngine.js`.

Quick facts agents must know
- There is no existing `.github/copilot-instructions.md` — this is the new canonical guidance for agents.
- The backend currently does NOT automatically wire routers or connect to MongoDB in `server.js`. Only `/ping` and `/api/report/sos` are exposed by `server.js`.
- There are two classification implementations: inline in `backend/routes/report.js` and a reusable one in `backend/utils/aiEngine.js`. This duplication is intentional in examples but should be normalized.
- `backend/.env` contains `MONGO_URI` and `JWT_SECRET` (local dev secrets). Do NOT commit production secrets.
- Frontend has one component (`ReportForm.js`) using relative `/api/report` requests (expects proxy), and another (`Dashboard.js`) requesting `http://localhost:5000/api/report` directly — these are inconsistent and will break developer expectations.

How to run locally (detectable from repo)
1. Start MongoDB locally or set `MONGO_URI` in `backend/.env`.
2. Backend: run `node backend/server.js` (there is no `start` script in `backend/package.json` by default).
   - After wiring DB and routes (see suggested change below), verify with `curl http://localhost:5000/ping` and `curl -X POST http://localhost:5000/api/report/sos`.
3. Frontend: `cd frontend && npm start` (CRA dev server).
   - `ReportForm` uses relative requests (`/api/report`). Either add a `"proxy": "http://localhost:5000"` entry to `frontend/package.json` or change `Dashboard.js` to use relative endpoints; prefer adding a `proxy` or setting an axios baseURL so frontend requests are consistent.

Key files & what to look for
- `backend/server.js` — current entrypoint; note: it does NOT import or mount `routes/*` nor connect to MongoDB. If you add DB / routes, update this file.
- `backend/routes/report.js` — report endpoints and an inline `classifyIncident()` (see comment: 🔥 Inline AI Logic). There is also a `POST /sos` here (not mounted by default).
- `backend/utils/aiEngine.js` — reusable `classifyIncident` implemented with keyword rules; prefer centralizing AI logic here.
- `backend/models/*.js` — Mongoose models (`Report`, `User`).
- `backend/.env` — local `MONGO_URI` and `JWT_SECRET`.
- `frontend/src/ReportForm.js` — posts report, expects relative `/api/report`.
- `frontend/src/Dashboard.js` — GETs reports from `http://localhost:5000/api/report` (inconsistent).

Common tasks & quick examples
- Wire DB and mount routes in `backend/server.js` (example):
```js
// top of file
require('dotenv').config();
const mongoose = require('mongoose');
// connect
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('Mongo connected'))
  .catch(err => console.error('Mongo connect error', err));
// mount routes
const reportRouter = require('./routes/report');
const authRouter = require('./routes/auth');
app.use('/api/report', reportRouter);
app.use('/api/auth', authRouter);
```
- Add a `start` script to `backend/package.json`: `"start": "node server.js"` for parity with frontend.
- Verify endpoints:
  - `curl http://localhost:5000/ping`
  - `curl -X POST http://localhost:5000/api/report/sos -d '{}' -H 'Content-Type: application/json'`

AI-specific notes 🔧
- Keyword-based incident classification is implemented in `backend/utils/aiEngine.js`. `routes/report.js` currently duplicates similar code inline — prefer importing `aiEngine` to avoid divergence.
- The current classifier is deterministic keyword matching; if integrating an LLM, put wrapper code in `utils/aiEngine.js` and keep feature flags / timeouts simple.

Conventions & gotchas ⚠️
- Backend uses CommonJS (`type: commonjs` in `backend/package.json`).
- JWT signing uses `process.env.JWT_SECRET` in `routes/auth.js`; there is no verification middleware in the repo — add `auth` middleware when implementing protected routes.
- There are many console logs with emoji markers (e.g., `🚨 SOS`); these are used as quick debugging signals in the codebase.

PR checklist for agents
- Keep changes small and focused. If changing endpoints, update both frontend and backend consistently.
- Add/centralize AI logic in `backend/utils/aiEngine.js` and update `routes/report.js` to import it.
- Add a `start` script to `backend/package.json` and document run steps in `backend/README.md`.
- Avoid committing secrets from `.env`.

If anything here is unclear or you'd like examples for a specific edit (e.g., creating auth middleware, adding tests, or refactoring AI logic), tell me which area to expand and I'll provide a small, focused patch.  
`