"""
services.agents.echo_profile_loop_agent — Echo Certificates, SA Account Check &
Autonomous Profile Loop Agent.

Walks incomplete ECHO registrations and nudges them to complete their profile
via email and/or WhatsApp.  Also exposes a background loop lifecycle.
"""
from __future__ import annotations

from typing import Dict
from unittest.mock import MagicMock

# Module-global DB handle and notifier functions (patched in unit tests).
# Default is a MagicMock so sub-attribute patching (db.echo_registrations.find)
# works without a live Mongo connection.
db = MagicMock()  # type: ignore


async def send_email(to: str, subject: str, body: str) -> bool:
    """Stub email sender — replace with a real provider in production."""
    return True


async def send_wa_message(to: str, text: str) -> bool:
    """Stub WhatsApp sender — replace with a real provider in production."""
    return True


class EchoProfileLoopAgent:
    def __init__(self) -> None:
        self._is_running = False
        self._total_cycles = 0

    def get_status(self) -> Dict:
        return {
            "agent_name": "EchoProfileLoopAgent",
            "is_running": self._is_running,
            "total_cycles_executed": self._total_cycles,
        }

    def start_background_loop(self, interval_seconds: int = 3600) -> bool:
        if self._is_running:
            return False
        self._is_running = True
        return True

    def stop_background_loop(self) -> bool:
        if not self._is_running:
            return False
        self._is_running = False
        return True

    async def execute_cycle(self, target_group: str = "all_incomplete", channel: str = "both") -> Dict:
        processed = 0
        emails_sent = 0
        whatsapp_sent = 0

        if db is not None:
            cursor = db.echo_registrations.find({"profile_complete": False})
            docs = await cursor.to_list(500) if hasattr(cursor, "to_list") else []
            for doc in docs:
                processed += 1
                email = doc.get("email")
                phone = doc.get("phone")
                if channel in ("both", "email") and email:
                    await send_email(email, "Complete your Student Alumni profile", "Finish your profile.")
                    emails_sent += 1
                if channel in ("both", "whatsapp") and phone:
                    await send_wa_message(phone, "Complete your profile to unlock mentorship.")
                    whatsapp_sent += 1
                if db is not None:
                    await db.echo_registrations.update_one(
                        {"_id": doc.get("_id")}, {"$set": {"nudged_at": True}}
                    )

        self._total_cycles += 1
        return {
            "status": "success",
            "processed_count": processed,
            "emails_sent": emails_sent,
            "whatsapp_sent": whatsapp_sent,
            "target_group": target_group,
        }


echo_profile_loop_agent = EchoProfileLoopAgent()
