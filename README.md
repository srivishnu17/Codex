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
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

By default, the UI calls `http://<current-host>:8000` so it works from other devices on the same network.

## Access from other devices on your LAN
1. Start backend and frontend with `--host 0.0.0.0` (shown above).
2. Open firewall ports 8000 and 5173 on the host laptop.
3. From another device, open `http://<HOST_LAPTOP_IP>:5173`.
4. Optional: restrict API CORS using `ALLOWED_ORIGINS`.

Example:
```bash
ALLOWED_ORIGINS=http://192.168.1.50:5173 uvicorn main:app --host 0.0.0.0 --port 8000
```
