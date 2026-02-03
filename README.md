# Local Task Manager (Offline-First)

This project is a local-only task management app for teams. The backend is a FastAPI REST service that reads/writes an Excel workbook on disk, and the frontend is a Vite + React dashboard with dark mode by default.

## Project Structure
- `backend/`: FastAPI service and Excel storage helpers
- `frontend/`: Vite + React UI

## Setup

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The UI expects the API at `http://localhost:8000`.
