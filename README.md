# Student Kare (SA Care)

Full-stack student health platform: React (TypeScript + Vite) frontend with a Python FastAPI backend.

- **Frontend:** React 18 + TypeScript + Vite + react-native-web (port 3000 / container port 80)
- **Backend:** FastAPI + Uvicorn (port 8000)
- **Database:** None (in-memory demo stores)

## Local Development

Terminal 1 — backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Terminal 2 — frontend:

```bash
npm install
npm run dev   # http://localhost:3000
```

## Environment Variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | Frontend (build time) | Full API base URL, e.g. `https://api.example.com/api` |

The frontend currently uses an offline mock fallback when the backend is unreachable, so the app works even without a live API.

## Production Build

```bash
npm run build   # outputs to dist/
```

## Docker (docker-compose)

```bash
VITE_API_BASE_URL=http://localhost:8000/api docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## Deploying to Dokploy

See: two-application setup (frontend + backend) — instructions below.

### Option A — Single Compose (fastest)
Deploy this repository as a **Compose** service in Dokploy, set `VITE_API_BASE_URL`, and attach your domain.

### Option B — Two Applications (recommended)
1. Backend app: source GitHub repo, build path `backend/`, build method **Dockerfile** (`backend/Dockerfile`), container port `8000`.
2. Frontend app: source same GitHub repo, build path `/`, build method **Dockerfile** (`Dockerfile`), set env `VITE_API_BASE_URL` to your backend's public URL, container port `80`.
3. Attach domains + SSL for each.
