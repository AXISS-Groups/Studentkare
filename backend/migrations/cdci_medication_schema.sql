-- ============================================================================
-- Studentkare Medication Module — CDCI & SNOMED CT India Canonical Schema
-- Compliance: EHR Standards for India 2016 (MoHFW), ABDM FHIR Guidelines
-- ============================================================================

-- 1. CDCI Clinical Drugs Table (Canonical SNOMED CT India Extension Codes)
CREATE TABLE IF NOT EXISTS t1_operational.cdci_clinical_drugs (
    cdci_code VARCHAR(64) PRIMARY KEY, -- SNOMED CT / CDCI Concept ID
    active_ingredient VARCHAR(255) NOT NULL,
    substance_code VARCHAR(64) NOT NULL,
    salt_form VARCHAR(255),
    strength VARCHAR(100) NOT NULL,
    dosage_form VARCHAR(100) NOT NULL,
    drug_class VARCHAR(255) NOT NULL,
    is_prescription_only BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 2. CDCI Branded Medicines Index
CREATE TABLE IF NOT EXISTS t1_operational.cdci_branded_medicines (
    brand_id VARCHAR(64) PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,
    cdci_code VARCHAR(64) REFERENCES t1_operational.cdci_clinical_drugs(cdci_code),
    manufacturer VARCHAR(255) NOT NULL,
    mrp_inr NUMERIC(10, 2),
    pack_size VARCHAR(100)
);

-- 3. NLEM Essential Medicines List
CREATE TABLE IF NOT EXISTS t1_operational.nlem_essential_medicines (
    nlem_id VARCHAR(64) PRIMARY KEY,
    cdci_code VARCHAR(64) REFERENCES t1_operational.cdci_clinical_drugs(cdci_code),
    category VARCHAR(255) NOT NULL,
    ceiling_price_inr NUMERIC(10, 2)
);

-- 4. Jan Aushadhi Generic Product Catalog (Public Health Information Layer)
CREATE TABLE IF NOT EXISTS t1_operational.jan_aushadhi_catalog (
    jan_code VARCHAR(64) PRIMARY KEY,
    generic_name VARCHAR(255) NOT NULL,
    substance_code VARCHAR(64) NOT NULL,
    dosage_form VARCHAR(100) NOT NULL,
    strength VARCHAR(100) NOT NULL,
    mrp_inr NUMERIC(10, 2) NOT NULL
);

-- 5. CDSCO Recalls and Spurious Batch Alerts
CREATE TABLE IF NOT EXISTS t1_operational.cdsco_recalls (
    recall_id VARCHAR(64) PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(255) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    issued_date DATE NOT NULL,
    alert_level VARCHAR(50) NOT NULL DEFAULT 'HIGH_ALERT'
);

-- 6. Advisor-Approved Monograph Content (Must have Medical Advisor Sign-Off)
CREATE TABLE IF NOT EXISTS t1_operational.advisor_approved_monographs (
    cdci_code VARCHAR(64) PRIMARY KEY REFERENCES t1_operational.cdci_clinical_drugs(cdci_code),
    plain_description_en TEXT NOT NULL,
    plain_description_te TEXT NOT NULL,
    common_side_effects TEXT[] NOT NULL,
    storage_guidance TEXT NOT NULL,
    advisor_name VARCHAR(255) NOT NULL,
    approval_date DATE NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_cdci_brand_name ON t1_operational.cdci_branded_medicines(LOWER(brand_name));
CREATE INDEX IF NOT EXISTS idx_cdci_substance ON t1_operational.cdci_clinical_drugs(substance_code);
