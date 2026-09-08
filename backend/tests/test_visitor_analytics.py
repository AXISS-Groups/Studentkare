import pytest
import anyio
import httpx
from server import app

@pytest.mark.anyio
async def test_visitor_heartbeat_and_events():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Visitor Heartbeat
        hb_payload = {
            "session_id": "sess_unit_test_999",
            "visitor_id": "vis_unit_test_999",
            "device_fingerprint": "fp_canvas_webgl_test",
            "current_path": "/courses",
            "current_module": "courses",
            "duration_seconds": 60,
            "page_views_count": 2,
            "clicks_count": 3,
            "inferred_name": "Rohan Patel",
            "inferred_email": "rohan.guest@example.com",
            "hardware": {
                "screen_resolution": "1920x1080",
                "cpu_cores": 8,
                "device_memory_gb": 16,
                "gpu_renderer": "NVIDIA GeForce RTX 3080",
                "timezone": "Asia/Kolkata",
                "language": "en-US"
            }
        }
        res = await client.post("/api/analytics/visitor/heartbeat", json=hb_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert data["alias"] == "Rohan Patel"

        # 2. Visitor Event
        ev_payload = {
            "session_id": "sess_unit_test_999",
            "visitor_id": "vis_unit_test_999",
            "event_type": "click",
            "module": "courses",
            "path": "/courses",
            "element_id": "btn_enroll_fast",
            "element_text": "Enroll Now"
        }
        res_ev = await client.post("/api/analytics/visitor/event", json=ev_payload)
        assert res_ev.status_code == 200
        assert res_ev.json()["ok"] is True

        # 3. Visitor Identify
        id_payload = {
            "visitor_id": "vis_unit_test_999",
            "session_id": "sess_unit_test_999",
            "name": "Rohan Patel",
            "email": "rohan.patel@alumni.org"
        }
        res_id = await client.post("/api/analytics/visitor/identify", json=id_payload)
        assert res_id.status_code == 200
        assert res_id.json()["ok"] is True
