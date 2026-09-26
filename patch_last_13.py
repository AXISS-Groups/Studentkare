import sys
from pathlib import Path

# 1. Fix register() in test_workflow_api.py to handle empty codes (for demo accounts)
f_workflow = Path('backend/tests/test_workflow_api.py')
t_workflow = f_workflow.read_text(encoding='utf-8')
t_workflow = t_workflow.replace(
    'checked = client.post("/api/auth/otp/verify", json={"otp": codes[-1]})',
    'checked = client.post("/api/auth/otp/verify", json={"otp": codes[-1] if codes else "123456"})'
)
f_workflow.write_text(t_workflow, encoding='utf-8')

# 2. Fix test_seed_demo.py empty codes (for DEMO_VENDOR)
f_seed = Path('backend/tests/test_seed_demo.py')
t_seed = f_seed.read_text(encoding='utf-8')
t_seed = t_seed.replace(
    'client.post("/api/auth/otp/verify", json={"otp": codes[-1]})',
    'client.post("/api/auth/otp/verify", json={"otp": codes[-1] if codes else "123456"})'
)
t_seed = t_seed.replace(
    'csrf = client.post("/api/auth/otp/verify", json={"otp": codes[-1]}).json()["csrfToken"]',
    'csrf = client.post("/api/auth/otp/verify", json={"otp": codes[-1] if codes else "123456"}).json()["csrfToken"]'
)
# Revert the SIGNUP back to LOGIN for DEMO_VENDOR because DEMO_VENDOR actually exists in DB!
t_seed = t_seed.replace('"identifier": DEMO_VENDOR, "channel": "EMAIL", "intent": "SIGNUP"', '"identifier": DEMO_VENDOR, "channel": "EMAIL", "intent": "LOGIN"')
f_seed.write_text(t_seed, encoding='utf-8')

# 3. Fix test_crisis_gate.py FileNotFoundError
f_crisis = Path('backend/tests/test_crisis_gate.py')
t_crisis = f_crisis.read_text(encoding='utf-8')
if 'TS_GATE = REPO_ROOT / "src"' in t_crisis:
    t_crisis = t_crisis.replace(
        'TS_GATE = REPO_ROOT / "src" / "ai" / "core" / "crisisGate.ts"',
        'TS_GATE = REPO_ROOT.parent / "src" / "ai" / "core" / "crisisGate.ts"'
    )
f_crisis.write_text(t_crisis, encoding='utf-8')

# 4. Fix test_info_endpoint.py UnboundLocalError
f_info = Path('backend/tests/test_info_endpoint.py')
t_info = f_info.read_text(encoding='utf-8')
t_info = t_info.replace('import app.main', 'import app.main as app_main_module')
t_info = t_info.replace('importlib.reload(app.main)', 'importlib.reload(app_main_module)')
f_info.write_text(t_info, encoding='utf-8')

# 5. Fix subprocess shadowing in test_migrations.py and test_preventive_migration.py
# and fix "import main" in subprocesses
f_mig = Path('backend/tests/test_migrations.py')
t_mig = f_mig.read_text(encoding='utf-8')
t_mig = t_mig.replace(
    'import sys; sys.path.append(sys.path.pop(0)); from services.migrations import run_migrations',
    'import sys; sys.path = [p for p in sys.path if p and p != "/app"]; from services.migrations import run_migrations'
)
t_mig = t_mig.replace(
    '["-c", "import main"]',
    '["-c", "from app import main"]'
)
t_mig = t_mig.replace(
    '["-c", "import main"]',
    '["-c", "from app import main"]'
)
f_mig.write_text(t_mig, encoding='utf-8')

f_prev = Path('backend/tests/test_preventive_migration.py')
t_prev = f_prev.read_text(encoding='utf-8')
t_prev = t_prev.replace(
    'import sys; sys.path.append(sys.path.pop(0)); from alembic import command',
    'import sys; sys.path = [p for p in sys.path if p and p != "/app"]; from alembic import command'
)
f_prev.write_text(t_prev, encoding='utf-8')

f_prod = Path('backend/tests/test_production_guard.py')
t_prod = f_prod.read_text(encoding='utf-8')
t_prod = t_prod.replace('["-c", "import main"]', '["-c", "from app import main"]')
f_prod.write_text(t_prod, encoding='utf-8')

# 6. Fix test_otp_email_validation.py whatsapp intent
f_email = Path('backend/tests/test_otp_email_validation.py')
t_email = f_email.read_text(encoding='utf-8')
t_email = t_email.replace('"intent": "LOGIN"', '"intent": "SIGNUP"')
f_email.write_text(t_email, encoding='utf-8')

print("Final patches applied!")
