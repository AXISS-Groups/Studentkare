"""
Local development helper to start the FastAPI backend with dev/test defaults.
Uses SQLite studentkare_test.db when local PostgreSQL is not configured,
enabling offline full-stack development without Docker.
"""
import os
import sys

# Ensure testing/local development mode uses sqlite and dev secret
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("OTP_HASH_SECRET", "dev-test-secret-studentkare")
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(repo_root, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False, app_dir=backend_dir)
