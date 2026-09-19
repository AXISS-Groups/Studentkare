"""
core.db — MongoDB connection (single source of truth).

Imported by server.py and all routers/* modules. Reads MONGO_URL and DB_NAME
from .env (these are protected vars and must NEVER be hardcoded).

IMPORTANT: AsyncIOMotorClient is created eagerly at import time so that
Motor's background thread-pool and connection logic bind to the correct
event loop.  Call `await warm_db()` from the FastAPI startup event to force
the topology discovery before the first request is served.
"""
import os
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv

# Load env from /app/backend/.env (parent directory of /core)
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

mongo_url = os.environ.get('MONGO_URL')

# Make the module import-safe: if MONGO_URL is unset (e.g. running with
# PostgreSQL persistence instead of Mongo), fall back to None so dependent
# modules can import without raising at import time.
if not mongo_url:
    client = None
    db = None
else:
    # Inject short timeouts so topology discovery never hangs for 60 s.
    _qs = "?" if "?" not in mongo_url else "&"
    if "serverSelectionTimeoutMS" not in mongo_url:
        mongo_url += ("?" if "?" not in mongo_url else "&") + "serverSelectionTimeoutMS=10000"
    if "connectTimeoutMS" not in mongo_url:
        mongo_url += "&connectTimeoutMS=10000"

    # Single shared connection pool — created once at import time.
    # Motor internally defers socket activity to a background thread, so this
    # does NOT block the event loop during import.
    _client_kwargs: Dict[str, Any] = {
        "maxPoolSize": 20,
        "minPoolSize": 2,
        "serverSelectionTimeoutMS": 10000,
    }
    # Only enable the TLS CA bundle when the URL is genuinely a TLS/Atlas
    # connection (tls=true, ssl=true, or mongodb+srv://). Passing tlsCAFile
    # alone forces TLS in PyMongo, which breaks plaintext self-hosted MongoDB.
    if any(tag in mongo_url.lower() for tag in ("tls=true", "ssl=true", "mongodb+srv://")):
        import certifi

        _client_kwargs["tlsCAFile"] = certifi.where()
    client = AsyncIOMotorClient(mongo_url, **_client_kwargs)
    db_name = os.environ.get('DB_NAME', 'studentalumniadmin')
    db = client[db_name]



async def warm_db() -> float:
    """
    Ping MongoDB and force topology discovery.
    Call this from FastAPI's startup event so the pool is warm before
    the first user request arrives.  Returns round-trip time in ms.
    """
    if client is None:
        return 0.0
    import time
    t0 = time.perf_counter()
    await client.admin.command("ping")
    elapsed_ms = (time.perf_counter() - t0) * 1000
    print(f"[DB] warm_db ping OK — {elapsed_ms:.1f} ms", flush=True)
    return elapsed_ms


__all__ = ['client', 'db', 'mongo_url', 'warm_db']
