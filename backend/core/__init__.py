"""core — shared backend utilities (db, security, models, deps).

Imported by server.py and routers/* modules. Single source of truth for
the application's foundation pieces: Mongo client, password hashing,
JWT issuance, encryption-at-rest, audit logging, Pydantic models, and
the `get_current_user` JWT dependency.
"""
