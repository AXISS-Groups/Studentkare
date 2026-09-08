-- ============================================================================
-- Studentkare Data Security Pattern — Database Schema & Access Control (PostgreSQL)
-- Compliance: DPDP Act 2023, DPDP Rules 2025 (Rule-K1, Rule-K8), ABDM Guidelines
-- ============================================================================

-- 1. Create Tiered Schemas
CREATE SCHEMA IF NOT EXISTS t0_public;
CREATE SCHEMA IF NOT EXISTS t1_operational;
CREATE SCHEMA IF NOT EXISTS t2_identity;
CREATE SCHEMA IF NOT EXISTS t3_clinical;
CREATE SCHEMA IF NOT EXISTS t4_sensitive_clinical;
CREATE SCHEMA IF NOT EXISTS audit_ledger;

-- 2. Create Isolated Roles per Plane (Rule-K1)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_operational') THEN
        CREATE ROLE app_operational;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_identity') THEN
        CREATE ROLE app_identity;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_clinical') THEN
        CREATE ROLE app_clinical;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_claims') THEN
        CREATE ROLE app_claims;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_dept') THEN
        CREATE ROLE agent_dept;
    END IF;
END $$;

-- 3. T0 Public Schema (Directory, Copy, Directory)
CREATE TABLE IF NOT EXISTS t0_public.provider_directory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    institution TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. T1 Operational Schema (Tickets, Invoices, Aggregates)
CREATE TABLE IF NOT EXISTS t1_operational.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    ticket_ref TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5. T2 Identity Schema (Column-Level Encrypted Identity, Per-Tenant KEK)
CREATE TABLE IF NOT EXISTS t2_identity.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    student_id TEXT NOT NULL UNIQUE,
    encrypted_name BYTEA NOT NULL,
    encrypted_phone BYTEA,
    encrypted_roll_number BYTEA,
    encrypted_abha_address BYTEA,
    encrypted_photo BYTEA,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6. T3 Clinical Schema (FHIR Resources, Envelope Encrypted, Per-Student DEK)
CREATE TABLE IF NOT EXISTS t3_clinical.fhir_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- e.g., Observation, MedicationRequest, AllergyIntolerance
    encrypted_payload BYTEA NOT NULL, -- Envelope encrypted with Student DEK
    dek_wrapped BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 7. T4 Sensitive Clinical Schema (Rule-K8 Category, Isolated Schema, Per-Record DEK)
CREATE TABLE IF NOT EXISTS t4_sensitive_clinical.sensitive_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    record_category TEXT NOT NULL, -- MentalHealth, STI, Reproductive, Genetic, SubstanceUse
    encrypted_payload BYTEA NOT NULL, -- Envelope encrypted with Per-Record DEK
    per_record_dek_wrapped BYTEA NOT NULL,
    reviewer_pool_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 8. Audit Ledger Schema (Append-Only, Hash-Chained, Immutable)
CREATE TABLE IF NOT EXISTS audit_ledger.access_events (
    id BIGSERIAL PRIMARY KEY,
    previous_hash TEXT NOT NULL,
    current_hash TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    actor_id TEXT NOT NULL,
    actor_type TEXT NOT NULL, -- HUMAN, AGENT, SYSTEM
    purpose_code TEXT NOT NULL, -- PurposeCode enum
    rule_reference TEXT NOT NULL, -- RuleId
    tenant_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    resource_types TEXT[] NOT NULL,
    outcome TEXT NOT NULL, -- SUCCESS, DENIED, BREAK_GLASS
    consent_artefact_id TEXT,
    break_glass_session_id TEXT
);

-- 9. Row Level Security (RLS) Policy Setup
ALTER TABLE t2_identity.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3_clinical.fhir_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE t4_sensitive_clinical.sensitive_records ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation RLS Policies
CREATE POLICY tenant_isolation_t2 ON t2_identity.student_profiles
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_t3 ON t3_clinical.fhir_resources
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_t4 ON t4_sensitive_clinical.sensitive_records
    USING (tenant_id = current_setting('app.current_tenant', true));

-- 10. Database Role Privileges (Strict Separation of Planes)
-- Grant usage on schemas
GRANT USAGE ON SCHEMA t0_public, t1_operational TO app_operational;
GRANT USAGE ON SCHEMA t2_identity TO app_identity;
GRANT USAGE ON SCHEMA t3_clinical TO app_clinical;
GRANT USAGE ON SCHEMA t4_sensitive_clinical TO app_clinical;
GRANT USAGE ON SCHEMA audit_ledger TO app_operational, app_identity, app_clinical, app_claims;

-- Table permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA t0_public, t1_operational TO app_operational;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA t2_identity TO app_identity;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA t3_clinical, t4_sensitive_clinical TO app_clinical;
GRANT INSERT, SELECT ON ALL TABLES IN SCHEMA audit_ledger TO app_operational, app_identity, app_clinical, app_claims;

-- STRICT RULE: ABSOLUTELY NO ACCESS FOR AGENTS ON T2/T3/T4
REVOKE ALL ON SCHEMA t2_identity, t3_clinical, t4_sensitive_clinical FROM agent_dept;
REVOKE ALL ON ALL TABLES IN SCHEMA t2_identity, t3_clinical, t4_sensitive_clinical FROM agent_dept;

-- STRICT RULE: NO ROLE HAS DELETE PRIVILEGES ON AUDIT LEDGER (APPEND-ONLY)
REVOKE DELETE ON ALL TABLES IN SCHEMA audit_ledger FROM PUBLIC, app_operational, app_identity, app_clinical, app_claims, agent_dept;
