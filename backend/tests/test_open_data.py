"""Open-data loader (scripts/open_data.py): refuses unsafe places, reads only what it can read exactly,
never guesses a schedule or a verification, and removes only its own rows. Rows here are invented."""
import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core import workflow_models as M
from scripts import open_data as O
from services.db_sql import Base

MEDICINES = """id,name,price(₹),Is_discontinued,manufacturer_name,type,pack_size_label,short_composition1,short_composition2
1,Testcillin 500 Capsule,50,FALSE,Invented Labs,allopathy,strip of 10 capsules,Amoxycillin (500mg),
2,Testcillin Plus Tablet,80,FALSE,Invented Labs,allopathy,strip of 10 tablets,Amoxycillin (250mg),Clavulanic Acid (125mg)
3,Oldmed Tablet,10,TRUE,Invented Labs,allopathy,strip of 10 tablets,Oldsalt (5mg),
4,Mysterymed,10,FALSE,Invented Labs,allopathy,box,Mysterysalt (5mg),
5,Weirdunit Tablet,10,FALSE,Invented Labs,allopathy,strip of 10 tablets,Weirdsalt (5 furlongs),
6,Twice Tablet,10,FALSE,Invented Labs,allopathy,strip of 10 tablets,Samesalt (5mg),Samesalt (10mg)
"""
FACILITIES = """Hospital Name,State,District,Address,Pincode,Telephone,Latitude,Longitude,Emergency Num
Invented General Hospital,Telangana,Hyderabad,1 Test Road,500001,040-0000000,17.4,78.4,Yes
Invented Half Pair Clinic,Telangana,Hyderabad,2 Test Road,50002,,17.4,,No
Invented Far Hospital,Kerala,Kochi,3 Test Road,682001,,9.9,76.3,No
,Telangana,Hyderabad,nameless,500003,,,,
"""


@pytest.fixture
def db(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.setenv("SEED_OPEN_DATA", "true")
    with sessionmaker(bind=engine, expire_on_commit=False)() as session:
        yield session


def write(tmp_path, name, text):
    path = tmp_path / name
    path.write_text(text, encoding="utf-8")
    return path


def test_refuses_production_staging_unset_and_no_opt_in(monkeypatch):
    for env in ("production", "staging", ""):
        monkeypatch.setenv("APP_ENV", env)
        with pytest.raises(O.Refused):
            O.check_allowed(True)
    monkeypatch.setenv("APP_ENV", "testing")
    with pytest.raises(O.Refused):
        O.check_allowed(False)
    monkeypatch.setenv("SEED_OPEN_DATA", "false")
    with pytest.raises(O.Refused):
        O.check_allowed(True)


def test_strength_reads_exactly_or_not_at_all():
    assert O.parse_strength("Amoxycillin (500mg)") == ("Amoxycillin", 500.0, "mg")
    assert O.parse_strength("Vitamin D3 (60000 IU)") == ("Vitamin D3", 60000.0, "IU")
    assert O.parse_strength("Salbutamol (100mcg)") == ("Salbutamol", 100.0, "mcg")
    assert O.parse_strength("Salt (5 furlongs)") is None
    assert O.parse_strength("Salt") is None
    assert O.parse_strength("Salt (0mg)") is None


def test_medicines_are_prescription_only_and_bad_rows_are_counted(db, tmp_path):
    counts = O.load_medicines(db, write(tmp_path, "m.csv", MEDICINES))
    assert counts["read"] == 6 and counts["added"] == 2
    assert counts["skipped: discontinued"] == 1 and counts["skipped: dosage form not clear"] == 1
    assert counts["skipped: composition not readable"] == 1 and counts["skipped: repeated salt"] == 1
    rows = db.scalars(select(M.Medicine)).all()
    assert {r.schedule for r in rows} == {"H"} and all(r.requires_prescription for r in rows)
    assert {r.source for r in rows} == {O.SOURCE} and all(r.id.startswith(O.PREFIX) for r in rows)
    combo = next(r for r in rows if r.name == "Testcillin Plus Tablet")
    assert combo.dosage_form == "TABLET"
    assert db.scalar(select(func.count()).select_from(M.MedicineIngredient)
                     .where(M.MedicineIngredient.medicine_id == combo.id)) == 2


def test_medicines_load_is_repeatable_and_dry_run_writes_nothing(db, tmp_path):
    path = write(tmp_path, "m.csv", MEDICINES)
    assert O.load_medicines(db, path, dry_run=True)["added"] == 2
    assert O.count_rows(db)["medicines"] == 0
    O.load_medicines(db, path)
    again = O.load_medicines(db, path)
    assert again["added"] == 0 and again["already there"] == 2 and O.count_rows(db)["medicines"] == 2


def test_medicine_file_without_a_composition_column_is_refused(db, tmp_path):
    with pytest.raises(O.Refused):
        O.load_medicines(db, write(tmp_path, "m.csv", "name,price\nX,1\n"))


def test_facilities_say_they_were_not_checked_and_keep_only_whole_data(db, tmp_path):
    path = write(tmp_path, "f.csv", FACILITIES)
    counts = O.load_facilities(db, path, "Invented list (test licence)", "https://example.test/ds",
                               state="Telangana")
    assert counts["added"] == 2 and counts["skipped: other state"] == 1 and counts["skipped: no name"] == 1
    rows = {r.name: r for r in db.scalars(select(M.CareFacility))}
    general = rows["Invented General Hospital"]
    assert general.emergency_24x7 and (general.latitude, general.longitude) == (17.4, 78.4)
    assert "not field-checked" in general.source and "Invented list" in general.source
    assert general.campus == "" and general.pincode == "500001"
    half = rows["Invented Half Pair Clinic"]
    assert half.latitude is None and half.longitude is None and half.pincode == ""


def test_facilities_need_an_https_source_link(db, tmp_path):
    with pytest.raises(O.Refused):
        O.load_facilities(db, write(tmp_path, "f.csv", FACILITIES), "x", "http://example.test")


def test_purge_removes_only_its_own_rows(db, tmp_path):
    db.add(M.Medicine(id="admin-med-1", name="Kept", composition_key="kept@1mg", dosage_form="TABLET", pack="p",
                      manufacturer="m", schedule="OTC", requires_prescription=False, active=True,
                      source="ADMIN", created_at=1.0, updated_at=1.0))
    db.commit()
    O.load_medicines(db, write(tmp_path, "m.csv", MEDICINES))
    O.load_facilities(db, write(tmp_path, "f.csv", FACILITIES), "x", "")
    removed = O.purge(db)
    assert removed["medicines removed"] == 2 and removed["facilities removed"] == 3
    assert O.count_rows(db) == {"medicines": 0, "facilities": 0}
    assert db.get(M.Medicine, "admin-med-1") is not None
