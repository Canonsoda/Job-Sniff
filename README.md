<div align="center">

# 🔍 Job-Sniff

### AI-powered resume screening & management platform for HR teams

[![Live Demo](https://img.shields.io/badge/Live%20Demo-job--sniff.onrender.com-6366f1?style=for-the-badge)](https://job-sniff.onrender.com/dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 📌 About the Project

Job-Sniff is a full-stack HR tool that lets recruiters upload, parse, and rank resumes using AI. Instead of manually reading through hundreds of CVs, HR teams can upload resumes in bulk, define their requirements, and let the platform surface the most relevant candidates automatically.

Built with the MERN stack, Gemini AI for resume parsing, and Meilisearch/Elasticsearch for fast full-text search and filtering.

---

## ✨ Features

- 📄 **Bulk resume upload** — HR can upload multiple resumes at once
- 🤖 **AI-powered parsing** — Gemini API extracts structured data (skills, experience, education) from raw resumes
- 🔎 **Smart search & filtering** — Meilisearch / Elasticsearch integration for fast, requirement-based candidate search
- 📊 **CV scoring** — LLM-based scoring ranks candidates against job requirements
- 🎯 **HR dashboard** — Clean interface to manage, sort, and shortlist candidates
- 🔐 **Role-based access** — Built for HR users

---

## 🛠️ Tech Stack

**Frontend**
- React.js (Vite)
- JavaScript
- Tailwind CSS

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose

**AI & Search**
- Gemini API (resume parsing & CV scoring)
- Meilisearch / Elasticsearch (full-text search)
- Python + Jupyter Notebook (CV scoring pipeline — `cv_llm_scoring/`)

---

## 📂 Project Structure

```
Job-Sniff/
├── frontend/           # React + Vite client (HR dashboard)
├── backend/            # Express API server
│   ├── routes/
│   ├── models/
│   └── controllers/
└── cv_llm_scoring/     # Python pipeline for LLM-based CV scoring
    └── *.ipynb         # Jupyter notebooks for scoring experiments
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Gemini API key
- Meilisearch instance (or Elasticsearch)

### Installation

```bash
# Clone the repo
git clone https://github.com/Canonsoda/Job-Sniff.git
cd Job-Sniff

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Environment Variables

Create a `.env` in `/backend`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_meilisearch_key
CLIENT_URL=http://localhost:5173
```

### Running the App

```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev
```

Frontend → `http://localhost:5173` | Backend → `http://localhost:5000`

---

## ⚠️ Known Issues

- Gemini API key hitting rate limits on the free tier — AI parsing temporarily unavailable on the live demo
- CV scoring pipeline is under active development

---

## 🔮 Upcoming

- [ ] Fix Gemini API integration
- [ ] Full deployment with working AI parsing
- [ ] Candidate shortlist export (PDF/CSV)
- [ ] Email notifications for shortlisted candidates

---

## 👨‍💻 Author

**Aryan** — ECE undergrad, full-stack developer

[![GitHub](https://img.shields.io/badge/GitHub-Canonsoda-181717?style=flat&logo=github)](https://github.com/Canonsoda)

---

<div align="center">
  <sub>Built with ☕ — open to feedback and contributions</sub>
</div>
