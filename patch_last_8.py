import sys
from pathlib import Path

# 1. Fix test_preventive_migration.py ModuleNotFoundError for services
f_prev = Path('backend/tests/test_preventive_migration.py')
t_prev = f_prev.read_text(encoding='utf-8')
t_prev = t_prev.replace(
    "import sys; sys.path = [p for p in sys.path if p and p != '/app']; from alembic import command",
    "import sys; sys.path.insert(0, [p for p in sys.path if 'site-packages' in p][0]); from alembic import command"
)
f_prev.write_text(t_prev, encoding='utf-8')

# 2. Fix test_migrations.py ModuleNotFoundError
f_mig = Path('backend/tests/test_migrations.py')
t_mig = f_mig.read_text(encoding='utf-8')
t_mig = t_mig.replace(
    "import sys; sys.path = [p for p in sys.path if p and p != '/app']; from services.migrations import run_migrations",
    "import sys; sys.path.insert(0, [p for p in sys.path if 'site-packages' in p][0]); from services.migrations import run_migrations"
)
f_mig.write_text(t_mig, encoding='utf-8')

# 3. Fix test_production_guard.py ModuleNotFoundError
f_prod = Path('backend/tests/test_production_guard.py')
t_prod = f_prod.read_text(encoding='utf-8')
t_prod = t_prod.replace('["-c", "from app import main"]', '["-c", "import sys; sys.path.insert(0, \'/app\'); from app import main"]')
f_prod.write_text(t_prod, encoding='utf-8')

print("Patches applied for migrations and production guard.")
