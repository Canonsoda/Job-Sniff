<div align="center">

# Job-Sniff

**Resume screening for recruiters — upload PDFs in bulk, let an LLM extract the structured fields, then search and shortlist across all of them.**

[![CI](https://github.com/Canonsoda/Job-Sniff/actions/workflows/ci.yml/badge.svg)](https://github.com/Canonsoda/Job-Sniff/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/demo-job--sniff.onrender.com-0f766e)](https://job-sniff.onrender.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## What it does

A recruiter uploads a batch of resumes. Instead of reading them, they search the batch by
skill, degree, institution or CGPA and star the candidates worth a call.

Each PDF is parsed once on upload: the text is extracted, an LLM turns it into structured
JSON (name, email, phone, skills, education, work experience, CGPA), and the result is
written to MongoDB and mirrored into an Elasticsearch index. Search queries hit the index,
not the database.

There is also an applicant role, which can upload a single resume and see only its own —
the recruiter side is the developed half of the product.

---

## Architecture

Three independently deployed services:

```
┌──────────────┐      JSON + JWT      ┌──────────────┐    multipart    ┌──────────────┐
│   frontend   │ ───────────────────► │   backend    │ ──────────────► │  ai-service  │
│              │                      │              │                 │              │
│ React + Vite │ ◄─────────────────── │   Express    │ ◄────────────── │    Flask     │
└──────────────┘                      └──────┬───────┘   parsed JSON   └──────┬───────┘
                                             │                                │
                        ┌────────────────────┼───────────────────┐            │ HTTPS
                        ▼                    ▼                   ▼            ▼
                   ┌─────────┐        ┌──────────────┐     ┌──────────┐  ┌────────────┐
                   │ MongoDB │        │Elasticsearch │     │    S3    │  │ OpenRouter │
                   │ (truth) │        │(search index)│     │  (PDFs)  │  │   (LLM)    │
                   └─────────┘        └──────────────┘     └──────────┘  └────────────┘
```

**Why the split is along a language boundary, not a feature boundary:** PDF extraction and
LLM orchestration are Python work. Parsing also takes 40–60s against a rate-limited third
party, so running it inside the API process would tie up a Node worker and stall the
dashboard for every other user. As a separate service it can be slow, fail, or redeploy on
its own.

### Upload pipeline

1. `multer` accepts the PDF (5 MB cap, PDF mimetype only, filename sanitised against path traversal)
2. Express streams it to the AI service at `POST /parse-resume`
3. `pypdf` extracts the text; the LLM is prompted with an explicit JSON schema at `temperature: 0`
4. **Only after parsing succeeds** the file is promoted into permanent storage — a failed parse leaves nothing behind
5. The record is saved to MongoDB, then indexed into Elasticsearch under the same `_id`

MongoDB is the source of truth; the index is a derived read model. There is no distributed
transaction between them — see [Known limitations](#known-limitations).

---

## Tech stack

| | |
|---|---|
| **Frontend** | React 18, Vite 4, Tailwind CSS 3, React Router 6, Axios, Framer Motion, Recharts, react-hot-toast |
| **Backend** | Node 18+, Express 4, Mongoose 8, JWT (`jsonwebtoken`), bcryptjs, Passport (Google OAuth 2.0), Multer, Nodemailer, Helmet, express-rate-limit |
| **Search** | Elasticsearch 9 — custom analyzer, explicit mapping, `bool` queries with scored `must` + cached `filter` |
| **AI service** | Python 3.12, Flask 3, pypdf, `requests` |
| **LLM** | Google Gemini 2.0 Flash, called via [OpenRouter](https://openrouter.ai) — swappable through `OPENROUTER_MODEL` |
| **Storage** | Local disk or any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, MinIO) |
| **Hosting** | Render — three free-tier services |

---

## Repository layout

```
Job-Sniff/
├── frontend/                 React SPA; server.js serves the build in production
│   └── src/
│       ├── components/       UploadSection, LoginForm, ProtectedRoute, …
│       ├── context/          AuthContext — decodes the JWT, auto-logout on expiry
│       ├── pages/Dashboard/  Home, Upload, Search, Shortlist, Settings
│       └── Layouts/          DashboardLayout — sidebar / mobile drawer
├── backend/                  Express API — the only service that touches MongoDB
│   ├── config/               db, passport, elasticSearch, storage, mail
│   ├── controller/           resume + user business logic
│   ├── middleware/           auth.middleware.js — verify JWT, resolve role from DB
│   ├── models/               Mongoose schemas
│   ├── routes/               auth, user, resume (multer config lives here)
│   ├── scripts/              sweep-orphans.mjs — storage reconciliation
│   └── tests/                node:test unit tests, no DB required
└── cv_llm_scoring/           Flask AI service
    ├── app.py                HTTP wrapper: /parse-resume, /health
    ├── process_resume.py     PDF → text → LLM → JSON, with retry/backoff
    └── *.ipynb               prototyping notebooks (not used at runtime)
```

---

## Running locally

### Prerequisites

- Node.js 18+ and Python 3.12+
- MongoDB (local or Atlas)
- An Elasticsearch instance (Elastic Cloud has a free trial)
- An [OpenRouter](https://openrouter.ai/keys) API key — free-tier models work
- *Optional:* Google OAuth credentials, Gmail app password, S3 bucket

Without Elasticsearch the app still runs — search returns an empty result set rather than
erroring. Without an OpenRouter key, uploads fail.

### Setup

```bash
git clone https://github.com/Canonsoda/Job-Sniff.git
cd Job-Sniff

# Each service has its own .env.example — copy and fill in
cp backend/.env.example        backend/.env
cp frontend/.env.example       frontend/.env
cp cv_llm_scoring/.env.example cv_llm_scoring/.env
```

### Start all three

```bash
# 1 — AI service        → http://localhost:5001
cd cv_llm_scoring && pip install -r requirements.txt && python app.py

# 2 — Backend API       → http://localhost:5000
cd backend && npm install && npm run dev

# 3 — Frontend          → http://localhost:5173
cd frontend && npm install && npm run dev
```

Start order does not matter; the backend only calls the AI service on upload.

### Other commands

```bash
cd backend
npm test                      # unit tests (node:test — no DB needed)
npm run check                 # syntax check
npm run sweep-orphans         # dry-run: list stored files with no DB record
npm run sweep-orphans -- --apply

cd frontend
npm run lint
npm run build
```

---

## Configuration

Every variable, and whether the app runs without it. Full templates are in each service's
`.env.example`.

### `backend/.env`

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | **yes** | process exits on connection failure |
| `JWT_SECRET` | **yes** | signing key for all tokens |
| `CLIENT_URL` | **yes** | CORS origin and OAuth redirect target |
| `PORT` | no | default `5000` |
| `CV_LLM_URL` | no | default `http://127.0.0.1:5001` |
| `CV_LLM_TIMEOUT_MS` | no | default `180000` — a parse takes 40–60s and retries up to 3× |
| `ELASTICSEARCH_URL` / `ELASTICSEARCH_API` | for search | search degrades to empty results without them |
| `ELASTICSEARCH_INDEX` | no | default `resumes` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | for Google login | email/password login works without them |
| `EMAIL_USER` / `EMAIL_PASS` | for welcome emails | Gmail app password, not the account password |
| `STORAGE_DRIVER` | no | `local` or `s3`; auto-selects `s3` when `S3_BUCKET` is set |
| `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | for s3 driver | |
| `S3_ENDPOINT` | no | set for R2/B2/MinIO; omit for AWS S3 |
| `S3_PREFIX` | no | default `resumes` |
| `KEEPALIVE_INTERVAL_MS` | no | default 10 min; `0` disables the AI-service warm ping |
| `NODE_ENV` | no | `production` hides stack traces from error responses |

### `frontend/.env`

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | **yes** | e.g. `http://localhost:5000/api` |

> `VITE_`-prefixed variables are inlined into the client bundle at build time and are
> **publicly readable**. Never put a secret here.

### `cv_llm_scoring/.env`

| Variable | Required | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | **yes** | |
| `OPENROUTER_MODEL` | no | default `google/gemini-2.0-flash-exp:free` |
| `PORT` / `HOST` | no | default `5001` / `0.0.0.0` |
| `DEBUG_DUMP_PARSED` | no | `1` logs each parsed payload |

---

## API

All `/api/resume` and `/api/user` routes require `Authorization: Bearer <jwt>`.

| Method | Endpoint | Notes |
|---|---|---|
| `POST` | `/api/auth/register` | |
| `POST` | `/api/auth/login` | |
| `GET` | `/api/auth/google` | starts the OAuth redirect |
| `GET` | `/api/auth/google/callback` | redirects to the SPA with a token |
| `PATCH` | `/api/auth/set-role` | returns a fresh token carrying the new role |
| `PATCH` | `/api/auth/update-recruiter-details` | |
| `GET` | `/api/user/profile` | |
| `PATCH` | `/api/user/settings` | also served at `/api/user/hr/settings` |
| `POST` | `/api/resume/upload` | single PDF |
| `POST` | `/api/resume/upload-multiple` | up to 10, processed sequentially |
| `GET` | `/api/resume/search` | `?query=&minCgpa=&maxCgpa=` |
| `GET` | `/api/resume/shortlisted` | |
| `GET` | `/api/resume/dashboard-stats` | counts + skill/CGPA distributions |
| `PATCH` | `/api/resume/:id/shortlist` | |
| `GET` | `/api/resume/:id/download` | streams the PDF |
| `POST` | `/api/resume/cleanup-duplicates` | own resumes only |
| `DELETE` | `/api/resume/clear-all` | own resumes only |
| `GET` | `/health` | no DB or ES call, so a slow dependency can't fail the check |

---

## Security notes

- Passwords hashed with bcrypt (cost 10); Google accounts have no password at all
- `authMiddleware` verifies the JWT signature but **reads the role from the database on
  every request** — a token is a snapshot from login, so a role change would otherwise not
  take effect until expiry. Unrecognised roles collapse to `applicant` (fail closed); this
  is what `backend/tests/auth.middleware.test.js` covers
- Upload filenames are sanitised against path traversal, and the stored key is re-validated
  on download
- Helmet, CORS allowlist, and rate limiting (1000 req / 15 min / IP) on `/api/`
- Destructive routes (`clear-all`, `cleanup-duplicates`) are scoped to the caller's own
  resumes regardless of role

---

## Known limitations

Honest list — these are design gaps, not TODO aspirations.

- **No organisation model.** Resumes belong to a user, not a company, so an HR account's
  *search and dashboard counts* span every resume in the database. Destructive routes are
  scoped to the caller, so no account can delete another's data, but proper multi-tenancy
  needs an `Organization` entity and an `orgId` filter on every query.
- **No refresh tokens.** Tokens last 24 hours with no revocation path; the client logs out
  when one expires.
- **JWTs live in `localStorage`,** which trades XSS exposure for CSRF immunity and
  cross-origin simplicity. An httpOnly refresh cookie plus an in-memory access token would
  be the upgrade.
- **Bulk upload is sequential and in-request.** Ten files at ~45s each will exceed most
  proxy timeouts. This belongs on a job queue.
- **Dual writes are not transactional.** If Elasticsearch fails after MongoDB succeeds the
  two disagree; shortlisting logs and continues, upload treats it as fatal. A change-stream
  or outbox worker is the correct fix.
- **`dashboard-stats` loads the whole collection** into memory to compute distributions.
  Fine at demo scale, wrong at real scale — this should be an aggregation pipeline.
- **Search returns at most 100 results** with no pagination.
- **Scanned/image-only PDFs extract no text,** so the LLM receives an empty document. OCR
  would be needed.
- **Prompt injection is not defended against.** Resume text is interpolated into the
  prompt behind `---` delimiters only. Parsed data only influences ranking and never grants
  access, so the blast radius is a bad ranking — but schema validation on the response is
  the missing mitigation.
- **Test coverage is limited to the auth middleware.** That is the highest-risk unit; the
  controllers are untested.
- **Free-tier caveats.** Render sleeps idle services (a scheduled workflow keeps the
  frontend warm), and free LLM models rate-limit — an upload can fail after 3 retries.

---

## License

MIT — see [LICENSE](LICENSE).

**Author:** Aryan — ECE undergrad · [github.com/Canonsoda](https://github.com/Canonsoda)
