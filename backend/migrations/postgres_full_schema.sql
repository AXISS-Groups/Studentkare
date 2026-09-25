-- Studentkare Postgres full schema (single database format, Postgres-only).
-- Generated 2026-09-23 from SQLAlchemy Base.metadata (72 tables).
-- Source of truth: backend/core/workflow_models.py + billing_models.py + preventive_models.py + models_sql.py
-- Apply with: alembic upgrade head  (preferred)  OR  psql $DATABASE_URL -f this_file
-- NOTE: set DATABASE_URL env, never commit real credentials.

CREATE TABLE agent_runs (
	id VARCHAR NOT NULL, 
	agent_name VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	result JSON NOT NULL, 
	created_at VARCHAR NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE app_users (
	id VARCHAR NOT NULL, 
	phone VARCHAR NOT NULL, 
	full_name VARCHAR NOT NULL, 
	email VARCHAR NOT NULL, 
	role VARCHAR NOT NULL, 
	points_balance INTEGER NOT NULL, 
	profile JSON NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE audit_logs (
	id VARCHAR NOT NULL, 
	timestamp VARCHAR NOT NULL, 
	actor_id VARCHAR NOT NULL, 
	actor_name VARCHAR NOT NULL, 
	actor_type VARCHAR NOT NULL, 
	action VARCHAR NOT NULL, 
	rule_id VARCHAR NOT NULL, 
	resource_type VARCHAR NOT NULL, 
	resource_id VARCHAR NOT NULL, 
	details TEXT NOT NULL, 
	institution_id VARCHAR NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE break_glass_sessions (
	id VARCHAR NOT NULL, 
	student_id VARCHAR NOT NULL, 
	requested_by_admin_id VARCHAR NOT NULL, 
	reason_category VARCHAR NOT NULL, 
	reason_text TEXT NOT NULL, 
	scope JSON NOT NULL, 
	dual_approver_admin_id VARCHAR NOT NULL, 
	sensitive_category VARCHAR NOT NULL, 
	created_at VARCHAR NOT NULL, 
	expires_at VARCHAR NOT NULL, 
	active BOOLEAN NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_accounts (
	id VARCHAR NOT NULL, 
	identifier VARCHAR(254) NOT NULL, 
	channel VARCHAR(16) NOT NULL, 
	full_name VARCHAR(120) NOT NULL, 
	role VARCHAR(24) NOT NULL, 
	active BOOLEAN NOT NULL, 
	profile JSON NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_activity_counters (
	id VARCHAR NOT NULL, 
	bucket INTEGER NOT NULL, 
	route VARCHAR(200) NOT NULL, 
	method VARCHAR(10) NOT NULL, 
	actor_role VARCHAR(24) NOT NULL, 
	status_class VARCHAR(3) NOT NULL, 
	count INTEGER NOT NULL, 
	total_latency_ms FLOAT NOT NULL, 
	max_latency_ms FLOAT NOT NULL, 
	last_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (bucket, route, method, actor_role, status_class)
);

CREATE TABLE care_agent_runs (
	id VARCHAR NOT NULL, 
	job_key VARCHAR(80) NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	started_at FLOAT NOT NULL, 
	finished_at FLOAT NOT NULL, 
	error VARCHAR(1000) NOT NULL, 
	summary JSON NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_agent_turns (
	id VARCHAR NOT NULL, 
	conversation_id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	agent VARCHAR(40) NOT NULL, 
	question VARCHAR(1000) NOT NULL, 
	answer VARCHAR(4000) NOT NULL, 
	outcome VARCHAR(24) NOT NULL, 
	citation_ids JSON NOT NULL, 
	top_score FLOAT NOT NULL, 
	generator VARCHAR(40) NOT NULL, 
	latency_ms FLOAT NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_appointments (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	provider_id VARCHAR NOT NULL, 
	catalog_item_id VARCHAR NOT NULL, 
	slot_id VARCHAR NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	created_at FLOAT NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(provider_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(catalog_item_id) REFERENCES care_catalog (id), 
	FOREIGN KEY(slot_id) REFERENCES care_availability_slots (id)
);

CREATE TABLE care_articles (
	id VARCHAR NOT NULL, 
	tag VARCHAR(60) NOT NULL, 
	title VARCHAR(180) NOT NULL, 
	read_time VARCHAR(20) NOT NULL, 
	color VARCHAR(20) NOT NULL, 
	body JSON NOT NULL, 
	active BOOLEAN NOT NULL, 
	sort INTEGER NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_availability_slots (
	id VARCHAR NOT NULL, 
	provider_id VARCHAR NOT NULL, 
	catalog_item_id VARCHAR NOT NULL, 
	slot_start VARCHAR(40) NOT NULL, 
	slot_end VARCHAR(40) NOT NULL, 
	capacity INTEGER NOT NULL, 
	booked INTEGER NOT NULL, 
	active BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(provider_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(catalog_item_id) REFERENCES care_catalog (id)
);

CREATE TABLE care_benefit_requests (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	request_key VARCHAR(80) NOT NULL, 
	message VARCHAR(2000) NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (account_id, request_key), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_billing_receipts (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	subscription_id VARCHAR NOT NULL, 
	provider VARCHAR(30) NOT NULL, 
	provider_invoice_id VARCHAR(120) NOT NULL, 
	provider_payment_id VARCHAR(120) NOT NULL, 
	amount_paise INTEGER NOT NULL, 
	currency VARCHAR(8) NOT NULL, 
	billing_start FLOAT NOT NULL, 
	billing_end FLOAT NOT NULL, 
	paid_at FLOAT NOT NULL, 
	refunded_paise INTEGER NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (provider, provider_invoice_id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(subscription_id) REFERENCES care_billing_subscriptions (id)
);

CREATE TABLE care_billing_subscriptions (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	plan_id VARCHAR(30) NOT NULL, 
	provider VARCHAR(30) NOT NULL, 
	provider_subscription_id VARCHAR(120) NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	cancel_at_period_end BOOLEAN NOT NULL, 
	current_start FLOAT NOT NULL, 
	current_end FLOAT NOT NULL, 
	created_at FLOAT NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_blood_donors (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	blood_group VARCHAR(5) NOT NULL, 
	hostel_block VARCHAR(160) NOT NULL, 
	phone VARCHAR(20) NOT NULL, 
	last_donated VARCHAR(40) NOT NULL, 
	is_available BOOLEAN NOT NULL, 
	visible BOOLEAN NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_blood_sos_requests (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	patient_name VARCHAR(120) NOT NULL, 
	required_group VARCHAR(5) NOT NULL, 
	units_needed INTEGER NOT NULL, 
	hospital_location VARCHAR(200) NOT NULL, 
	urgency VARCHAR(20) NOT NULL, 
	matching_donors_count INTEGER NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_camp_attendances (
	id VARCHAR NOT NULL, 
	camp_id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	checked_in BOOLEAN NOT NULL, 
	completed_stations JSON NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (camp_id, account_id), 
	FOREIGN KEY(camp_id) REFERENCES care_health_camps (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_campus_verifications (
	account_id VARCHAR NOT NULL, 
	university VARCHAR(160) NOT NULL, 
	roll_number VARCHAR(80) NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	verified_by VARCHAR NOT NULL, 
	verified_at FLOAT NOT NULL, 
	PRIMARY KEY (account_id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_catalog (
	id VARCHAR NOT NULL, 
	provider_id VARCHAR NOT NULL, 
	kind VARCHAR(20) NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	brand VARCHAR(100) NOT NULL, 
	category VARCHAR(30) NOT NULL, 
	description VARCHAR(2000) NOT NULL, 
	pack VARCHAR(160) NOT NULL, 
	price_paise INTEGER NOT NULL, 
	mrp_paise INTEGER NOT NULL, 
	stock INTEGER NOT NULL, 
	active BOOLEAN NOT NULL, 
	requires_prescription BOOLEAN NOT NULL, 
	preparation VARCHAR(1000) NOT NULL, 
	image_id VARCHAR(80), 
	image_mime VARCHAR(40), 
	PRIMARY KEY (id), 
	FOREIGN KEY(provider_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_claim_requests (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	policy_id VARCHAR NOT NULL, 
	provider_name VARCHAR(160) NOT NULL, 
	service VARCHAR(160) NOT NULL, 
	amount_paise INTEGER NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(policy_id) REFERENCES care_policies (id)
);

CREATE TABLE care_consultation_sessions (
	id VARCHAR NOT NULL, 
	appointment_id VARCHAR NOT NULL, 
	student_id VARCHAR NOT NULL, 
	provider_id VARCHAR NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	student_joined_at FLOAT NOT NULL, 
	provider_joined_at FLOAT NOT NULL, 
	ended_at FLOAT NOT NULL, 
	signal_payload JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(appointment_id) REFERENCES care_appointments (id), 
	FOREIGN KEY(student_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(provider_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_contract_seats (
	id VARCHAR NOT NULL, 
	contract_id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (contract_id, account_id), 
	FOREIGN KEY(contract_id) REFERENCES care_enterprise_contracts (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_crisis_events (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	kind VARCHAR(24) NOT NULL, 
	language VARCHAR(10) NOT NULL, 
	surface VARCHAR(40) NOT NULL, 
	detected_by VARCHAR(10) NOT NULL, 
	created_at FLOAT NOT NULL, 
	acknowledged_at FLOAT NOT NULL, 
	acknowledged_by VARCHAR NOT NULL, 
	outcome VARCHAR(24) NOT NULL, 
	outcome_note VARCHAR(500) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_deletion_requests (
	account_id VARCHAR NOT NULL, 
	requested_at FLOAT NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	processed_at FLOAT NOT NULL, 
	PRIMARY KEY (account_id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_dispense_items (
	id VARCHAR NOT NULL, 
	dispense_id VARCHAR NOT NULL, 
	prescription_item_id VARCHAR NOT NULL, 
	quantity_requested INTEGER NOT NULL, 
	quantity_dispensed INTEGER NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	note VARCHAR(300) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(dispense_id) REFERENCES care_dispenses (id), 
	FOREIGN KEY(prescription_item_id) REFERENCES care_prescription_items (id)
);

CREATE TABLE care_dispenses (
	id VARCHAR NOT NULL, 
	prescription_id VARCHAR NOT NULL, 
	pharmacy_id VARCHAR NOT NULL, 
	patient_id VARCHAR NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	verified_by VARCHAR NOT NULL, 
	verified_at FLOAT NOT NULL, 
	substitution_note VARCHAR(500) NOT NULL, 
	rejection_reason VARCHAR(300) NOT NULL, 
	delivery JSON NOT NULL, 
	created_at FLOAT NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(prescription_id) REFERENCES care_prescriptions (id), 
	FOREIGN KEY(pharmacy_id) REFERENCES care_service_providers (id), 
	FOREIGN KEY(patient_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_document_intake (
	id VARCHAR NOT NULL, 
	document_id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	extractor VARCHAR(40) NOT NULL, 
	draft JSON NOT NULL, 
	created_at FLOAT NOT NULL, 
	processed_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(document_id) REFERENCES care_documents (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_documents (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	title VARCHAR(160) NOT NULL, 
	category VARCHAR(30) NOT NULL, 
	filename VARCHAR(200) NOT NULL, 
	mime_type VARCHAR(100) NOT NULL, 
	content BYTEA NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_encounter_notes (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	patient_id VARCHAR NOT NULL, 
	appointment_id VARCHAR NOT NULL, 
	subjective VARCHAR(2000) NOT NULL, 
	objective VARCHAR(2000) NOT NULL, 
	assessment VARCHAR(2000) NOT NULL, 
	plan VARCHAR(2000) NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	created_at FLOAT NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(patient_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_enterprise_contracts (
	id VARCHAR NOT NULL, 
	organization VARCHAR(160) NOT NULL, 
	manager_account_id VARCHAR NOT NULL, 
	plan_id VARCHAR(30) NOT NULL, 
	seats INTEGER NOT NULL, 
	annual_amount_paise INTEGER NOT NULL, 
	signed_reference VARCHAR(160) NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	payment_reference VARCHAR(160) NOT NULL, 
	amount_paid_paise INTEGER NOT NULL, 
	period_start FLOAT NOT NULL, 
	period_end FLOAT NOT NULL, 
	created_at FLOAT NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(manager_account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_enterprise_inquiries (
	id VARCHAR NOT NULL, 
	organization VARCHAR(160) NOT NULL, 
	contact_name VARCHAR(120) NOT NULL, 
	email VARCHAR(254) NOT NULL, 
	seats INTEGER NOT NULL, 
	plan_id VARCHAR(30) NOT NULL, 
	message VARCHAR(4000) NOT NULL, 
	consent BOOLEAN NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	created_at FLOAT NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_exercise_sessions (
	id VARCHAR NOT NULL, 
	client_id VARCHAR(80) NOT NULL, 
	account_id VARCHAR NOT NULL, 
	summary JSON NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (account_id, client_id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_followup_tasks (
	id VARCHAR NOT NULL, 
	order_id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	note VARCHAR(400) NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	created_at FLOAT NOT NULL, 
	resolved_at FLOAT NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_health_camp_stations (
	id VARCHAR NOT NULL, 
	camp_id VARCHAR NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	sort INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(camp_id) REFERENCES care_health_camps (id)
);

CREATE TABLE care_health_camps (
	id VARCHAR NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	date VARCHAR(10) NOT NULL, 
	location VARCHAR(160) NOT NULL, 
	active BOOLEAN NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_home_content (
	key VARCHAR(40) NOT NULL, 
	title VARCHAR(160) NOT NULL, 
	eyebrow VARCHAR(80) NOT NULL, 
	body VARCHAR(4000) NOT NULL, 
	summary VARCHAR(400) NOT NULL, 
	action VARCHAR(120) NOT NULL, 
	target VARCHAR(40) NOT NULL, 
	icon VARCHAR(40) NOT NULL, 
	color VARCHAR(20) NOT NULL, 
	sort INTEGER NOT NULL, 
	active BOOLEAN NOT NULL, 
	PRIMARY KEY (key)
);

CREATE TABLE care_intake_review_items (
	id VARCHAR NOT NULL, 
	intake_id VARCHAR NOT NULL, 
	field VARCHAR(60) NOT NULL, 
	value VARCHAR(500) NOT NULL, 
	confidence FLOAT NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	reviewed_by VARCHAR NOT NULL, 
	reviewed_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(intake_id) REFERENCES care_document_intake (id)
);

CREATE TABLE care_knowledge_chunks (
	id VARCHAR NOT NULL, 
	source_id VARCHAR NOT NULL, 
	ordinal INTEGER NOT NULL, 
	content VARCHAR(2000) NOT NULL, 
	source_version INTEGER NOT NULL, 
	embedder VARCHAR(40) NOT NULL, 
	vector JSON NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(source_id) REFERENCES care_knowledge_sources (id)
);

CREATE TABLE care_knowledge_sources (
	id VARCHAR NOT NULL, 
	title VARCHAR(180) NOT NULL, 
	category VARCHAR(60) NOT NULL, 
	content VARCHAR(4000) NOT NULL, 
	author VARCHAR(120) NOT NULL, 
	version INTEGER NOT NULL, 
	reviewed BOOLEAN NOT NULL, 
	active BOOLEAN NOT NULL, 
	created_at FLOAT NOT NULL, 
	expires_at FLOAT NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_lab_orders (
	id VARCHAR NOT NULL, 
	prescription_id VARCHAR NOT NULL, 
	patient_id VARCHAR NOT NULL, 
	lab_id VARCHAR NOT NULL, 
	ordered_by VARCHAR NOT NULL, 
	test_panel JSON NOT NULL, 
	clinical_indication VARCHAR(500) NOT NULL, 
	collection_mode VARCHAR(12) NOT NULL, 
	slot_start VARCHAR(40) NOT NULL, 
	fasting_required BOOLEAN NOT NULL, 
	collector_name VARCHAR(120) NOT NULL, 
	sample_id VARCHAR(40) NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	report_document_id VARCHAR NOT NULL, 
	critical_flag BOOLEAN NOT NULL, 
	critical_note VARCHAR(500) NOT NULL, 
	critical_acknowledged_at FLOAT NOT NULL, 
	critical_acknowledged_by VARCHAR NOT NULL, 
	rejection_reason VARCHAR(300) NOT NULL, 
	created_at FLOAT NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(lab_id) REFERENCES care_service_providers (id)
);

CREATE TABLE care_medication_doses (
	id VARCHAR NOT NULL, 
	plan_id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	dose_date VARCHAR(10) NOT NULL, 
	dose_time VARCHAR(8) NOT NULL, 
	taken_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (plan_id, dose_date, dose_time), 
	FOREIGN KEY(plan_id) REFERENCES care_medication_plans (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_medication_plans (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	dosage VARCHAR(120) NOT NULL, 
	frequency VARCHAR(120) NOT NULL, 
	source VARCHAR(30) NOT NULL, 
	active BOOLEAN NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_notification_preferences (
	account_id VARCHAR NOT NULL, 
	email_enabled BOOLEAN NOT NULL, 
	push_enabled BOOLEAN NOT NULL, 
	reminders_enabled BOOLEAN NOT NULL, 
	timezone VARCHAR(40) NOT NULL, 
	quiet_start VARCHAR(5) NOT NULL, 
	quiet_end VARCHAR(5) NOT NULL, 
	PRIMARY KEY (account_id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_ops_events (
	id VARCHAR NOT NULL, 
	kind VARCHAR(48) NOT NULL, 
	domain VARCHAR(16) NOT NULL, 
	severity VARCHAR(10) NOT NULL, 
	actor_id VARCHAR NOT NULL, 
	actor_role VARCHAR(24) NOT NULL, 
	subject_id VARCHAR NOT NULL, 
	provider_id VARCHAR NOT NULL, 
	resource_type VARCHAR(32) NOT NULL, 
	resource_id VARCHAR NOT NULL, 
	summary VARCHAR(300) NOT NULL, 
	created_at FLOAT NOT NULL, 
	acknowledged_at FLOAT NOT NULL, 
	acknowledged_by VARCHAR NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_order_lines (
	id VARCHAR NOT NULL, 
	order_id VARCHAR NOT NULL, 
	item_id VARCHAR NOT NULL, 
	provider_id VARCHAR NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	kind VARCHAR(20) NOT NULL, 
	quantity INTEGER NOT NULL, 
	price_paise INTEGER NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(order_id) REFERENCES care_orders (id), 
	FOREIGN KEY(item_id) REFERENCES care_catalog (id), 
	FOREIGN KEY(provider_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_orders (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	idempotency_key VARCHAR(80) NOT NULL, 
	request_hash VARCHAR(64) NOT NULL, 
	total_paise INTEGER NOT NULL, 
	delivery JSON NOT NULL, 
	requested_slot VARCHAR(40) NOT NULL, 
	payment_status VARCHAR(24) NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (account_id, idempotency_key), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_otp_challenges (
	token_hash VARCHAR(64) NOT NULL, 
	identifier VARCHAR(254) NOT NULL, 
	intent VARCHAR(12) NOT NULL, 
	channel VARCHAR(16) NOT NULL, 
	code_hash VARCHAR(64) NOT NULL, 
	expires_at FLOAT NOT NULL, 
	attempts INTEGER NOT NULL, 
	consumed BOOLEAN NOT NULL, 
	PRIMARY KEY (token_hash)
);

CREATE TABLE care_outbox_events (
	id VARCHAR NOT NULL, 
	event_type VARCHAR(60) NOT NULL, 
	account_id VARCHAR NOT NULL, 
	dedupe_key VARCHAR(120) NOT NULL, 
	payload JSON NOT NULL, 
	attempts INTEGER NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	created_at FLOAT NOT NULL, 
	sent_at FLOAT NOT NULL, 
	read_at FLOAT NOT NULL, 
	last_error VARCHAR(1000) NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_payments (
	id VARCHAR NOT NULL, 
	order_id VARCHAR NOT NULL, 
	amount_paise INTEGER NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	provider VARCHAR(40) NOT NULL, 
	provider_ref VARCHAR(120) NOT NULL, 
	idempotency_key VARCHAR(80) NOT NULL, 
	created_at FLOAT NOT NULL, 
	settled_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(order_id) REFERENCES care_orders (id)
);

CREATE TABLE care_policies (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	insurer VARCHAR(100) NOT NULL, 
	policy_number VARCHAR(100) NOT NULL, 
	sum_insured INTEGER NOT NULL, 
	valid_until VARCHAR(10) NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_preferences (
	account_id VARCHAR NOT NULL, 
	saved_exercises JSON NOT NULL, 
	completed_tasks JSON NOT NULL, 
	task_date VARCHAR(10) NOT NULL, 
	PRIMARY KEY (account_id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_prescription_items (
	id VARCHAR NOT NULL, 
	prescription_id VARCHAR NOT NULL, 
	generic_name VARCHAR(160) NOT NULL, 
	brand_name VARCHAR(160) NOT NULL, 
	strength VARCHAR(60) NOT NULL, 
	form VARCHAR(40) NOT NULL, 
	dose VARCHAR(60) NOT NULL, 
	frequency VARCHAR(60) NOT NULL, 
	duration_days INTEGER NOT NULL, 
	quantity INTEGER NOT NULL, 
	substitution_allowed BOOLEAN NOT NULL, 
	schedule_class VARCHAR(4) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(prescription_id) REFERENCES care_prescriptions (id)
);

CREATE TABLE care_prescriptions (
	id VARCHAR NOT NULL, 
	encounter_id VARCHAR NOT NULL, 
	prescriber_id VARCHAR NOT NULL, 
	prescriber_reg_no VARCHAR(60) NOT NULL, 
	patient_id VARCHAR NOT NULL, 
	issued_at FLOAT NOT NULL, 
	valid_until FLOAT NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	advice VARCHAR(1000) NOT NULL, 
	allergy_check JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(prescriber_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(patient_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_preventive_preferences (
	account_id VARCHAR NOT NULL, 
	seasonal_education_enabled BOOLEAN NOT NULL, 
	promotions_enabled BOOLEAN NOT NULL, 
	region VARCHAR(100) NOT NULL, 
	topics JSON NOT NULL, 
	consent_version INTEGER NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (account_id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_preventive_providers (
	id VARCHAR NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	source_url VARCHAR(2000) NOT NULL, 
	booking_url VARCHAR(2000), 
	last_verified_at FLOAT, 
	expires_at FLOAT, 
	active BOOLEAN NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_preventive_report_reviews (
	id VARCHAR NOT NULL, 
	document_id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	assigned_clinician_id VARCHAR, 
	status VARCHAR(20) NOT NULL, 
	version INTEGER NOT NULL, 
	document_hash VARCHAR(64) NOT NULL, 
	guidance JSON NOT NULL, 
	content_hash VARCHAR(64), 
	reviewed_by VARCHAR, 
	reviewed_at FLOAT, 
	created_at FLOAT NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_preventive_review_status CHECK (status IN ('REQUESTED', 'ASSIGNED', 'APPROVED', 'REJECTED', 'WITHDRAWN')), 
	UNIQUE (document_id), 
	FOREIGN KEY(document_id) REFERENCES care_documents (id) ON DELETE CASCADE, 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(assigned_clinician_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(reviewed_by) REFERENCES care_accounts (id)
);

CREATE TABLE care_preventive_vaccines (
	id VARCHAR NOT NULL, 
	provider_id VARCHAR NOT NULL, 
	vaccine_name VARCHAR(160) NOT NULL, 
	pincode VARCHAR(6) NOT NULL, 
	region VARCHAR(100) NOT NULL, 
	source_url VARCHAR(2000) NOT NULL, 
	last_verified_at FLOAT, 
	expires_at FLOAT, 
	price_paise INTEGER, 
	availability VARCHAR(20) NOT NULL, 
	active BOOLEAN NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_preventive_vaccine_price CHECK (price_paise IS NULL OR price_paise >= 0), 
	CONSTRAINT ck_preventive_availability CHECK (availability IN ('UNKNOWN', 'CONFIRMED')), 
	FOREIGN KEY(provider_id) REFERENCES care_preventive_providers (id)
);

CREATE TABLE care_rate_buckets (
	key VARCHAR(120) NOT NULL, 
	count INTEGER NOT NULL, 
	expires_at FLOAT NOT NULL, 
	PRIMARY KEY (key)
);

CREATE TABLE care_readings (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	metric VARCHAR(30) NOT NULL, 
	value FLOAT NOT NULL, 
	recorded_at VARCHAR(40) NOT NULL, 
	source VARCHAR(30) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_record_shares (
	id VARCHAR NOT NULL, 
	owner_id VARCHAR NOT NULL, 
	clinician_id VARCHAR NOT NULL, 
	document_id VARCHAR NOT NULL, 
	granted_at FLOAT NOT NULL, 
	expires_at FLOAT NOT NULL, 
	revoked BOOLEAN NOT NULL, 
	last_viewed_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(clinician_id) REFERENCES care_accounts (id), 
	FOREIGN KEY(document_id) REFERENCES care_documents (id)
);

CREATE TABLE care_reviewed_benefits (
	id VARCHAR NOT NULL, 
	category VARCHAR(60) NOT NULL, 
	title VARCHAR(160) NOT NULL, 
	description VARCHAR(1000) NOT NULL, 
	reviewed BOOLEAN NOT NULL, 
	sort INTEGER NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE care_scheduled_jobs (
	key VARCHAR(80) NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	interval_seconds INTEGER NOT NULL, 
	enabled BOOLEAN NOT NULL, 
	last_run_at FLOAT NOT NULL, 
	next_run_at FLOAT NOT NULL, 
	last_status VARCHAR(20) NOT NULL, 
	last_error VARCHAR(1000) NOT NULL, 
	PRIMARY KEY (key)
);

CREATE TABLE care_service_providers (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	kind VARCHAR(12) NOT NULL, 
	legal_name VARCHAR(160) NOT NULL, 
	licence_no VARCHAR(80) NOT NULL, 
	licence_expiry FLOAT NOT NULL, 
	accreditation VARCHAR(80) NOT NULL, 
	address VARCHAR(400) NOT NULL, 
	pincode VARCHAR(6) NOT NULL, 
	latitude FLOAT NOT NULL, 
	longitude FLOAT NOT NULL, 
	serviceable_pincodes JSON NOT NULL, 
	open_hours VARCHAR(200) NOT NULL, 
	home_collection BOOLEAN NOT NULL, 
	source_url VARCHAR(2000) NOT NULL, 
	verified_at FLOAT NOT NULL, 
	active BOOLEAN NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_sessions (
	token_hash VARCHAR(64) NOT NULL, 
	account_id VARCHAR NOT NULL, 
	csrf_token VARCHAR(100) NOT NULL, 
	expires_at FLOAT NOT NULL, 
	PRIMARY KEY (token_hash), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_signup_grants (
	token_hash VARCHAR(64) NOT NULL, 
	identifier VARCHAR(254) NOT NULL, 
	channel VARCHAR(16) NOT NULL, 
	csrf_token VARCHAR(100) NOT NULL, 
	expires_at FLOAT NOT NULL, 
	consumed BOOLEAN NOT NULL, 
	PRIMARY KEY (token_hash)
);

CREATE TABLE care_substitution_requests (
	id VARCHAR NOT NULL, 
	dispense_id VARCHAR NOT NULL, 
	prescription_item_id VARCHAR NOT NULL, 
	proposed_by VARCHAR NOT NULL, 
	proposed_generic VARCHAR(160) NOT NULL, 
	proposed_brand VARCHAR(160) NOT NULL, 
	reason VARCHAR(300) NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	decided_by VARCHAR NOT NULL, 
	decided_at FLOAT NOT NULL, 
	decision_note VARCHAR(300) NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(dispense_id) REFERENCES care_dispenses (id), 
	FOREIGN KEY(prescription_item_id) REFERENCES care_prescription_items (id)
);

CREATE TABLE care_support_requests (
	id VARCHAR NOT NULL, 
	account_id VARCHAR NOT NULL, 
	subject VARCHAR(160) NOT NULL, 
	message VARCHAR(2000) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES care_accounts (id)
);

CREATE TABLE care_system_settings (
	key VARCHAR(60) NOT NULL, 
	value JSON NOT NULL, 
	updated_at FLOAT NOT NULL, 
	PRIMARY KEY (key)
);

CREATE TABLE care_workflow_audit (
	id VARCHAR NOT NULL, 
	actor_id VARCHAR NOT NULL, 
	action VARCHAR(80) NOT NULL, 
	resource_id VARCHAR NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE code_health_findings (
	fingerprint VARCHAR NOT NULL, 
	rule_id VARCHAR NOT NULL, 
	family VARCHAR NOT NULL, 
	severity VARCHAR NOT NULL, 
	tier VARCHAR NOT NULL, 
	autofixable BOOLEAN NOT NULL, 
	file VARCHAR NOT NULL, 
	line INTEGER NOT NULL, 
	symbol VARCHAR NOT NULL, 
	evidence TEXT NOT NULL, 
	blast_radius VARCHAR NOT NULL, 
	proposed_fix TEXT NOT NULL, 
	confidence VARCHAR NOT NULL, 
	verification_method VARCHAR NOT NULL, 
	PRIMARY KEY (fingerprint)
);

CREATE TABLE department_states (
	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	plane VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	kill_switch_active BOOLEAN NOT NULL, 
	rules JSON NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE tenants (
	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	code VARCHAR NOT NULL, 
	tier VARCHAR NOT NULL, 
	active_seats INTEGER NOT NULL, 
	max_seats INTEGER NOT NULL, 
	abdm_facility_id VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	joined_at VARCHAR NOT NULL, 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_app_users_phone ON app_users (phone);
CREATE UNIQUE INDEX ix_care_accounts_identifier ON care_accounts (identifier);
CREATE INDEX ix_care_activity_counters_actor_role ON care_activity_counters (actor_role);
CREATE INDEX ix_care_activity_counters_route ON care_activity_counters (route);
CREATE INDEX ix_care_activity_counters_bucket ON care_activity_counters (bucket);
CREATE INDEX ix_care_activity_counters_status_class ON care_activity_counters (status_class);
CREATE INDEX ix_care_agent_runs_job_key ON care_agent_runs (job_key);
CREATE INDEX ix_care_agent_turns_agent ON care_agent_turns (agent);
CREATE INDEX ix_care_agent_turns_conversation_id ON care_agent_turns (conversation_id);
CREATE INDEX ix_care_agent_turns_created_at ON care_agent_turns (created_at);
CREATE INDEX ix_care_agent_turns_outcome ON care_agent_turns (outcome);
CREATE INDEX ix_care_agent_turns_account_id ON care_agent_turns (account_id);
CREATE INDEX ix_care_appointments_provider_id ON care_appointments (provider_id);
CREATE INDEX ix_care_appointments_catalog_item_id ON care_appointments (catalog_item_id);
CREATE INDEX ix_care_appointments_account_id ON care_appointments (account_id);
CREATE INDEX ix_care_appointments_slot_id ON care_appointments (slot_id);
CREATE INDEX ix_care_availability_slots_catalog_item_id ON care_availability_slots (catalog_item_id);
CREATE INDEX ix_care_availability_slots_provider_id ON care_availability_slots (provider_id);
CREATE INDEX ix_care_benefit_requests_account_id ON care_benefit_requests (account_id);
CREATE INDEX ix_care_billing_receipts_subscription_id ON care_billing_receipts (subscription_id);
CREATE INDEX ix_care_billing_receipts_account_id ON care_billing_receipts (account_id);
CREATE INDEX ix_care_billing_subscriptions_provider_subscription_id ON care_billing_subscriptions (provider_subscription_id);
CREATE INDEX ix_care_billing_subscriptions_account_id ON care_billing_subscriptions (account_id);
CREATE INDEX ix_care_blood_donors_blood_group ON care_blood_donors (blood_group);
CREATE INDEX ix_care_blood_donors_account_id ON care_blood_donors (account_id);
CREATE INDEX ix_care_blood_sos_requests_account_id ON care_blood_sos_requests (account_id);
CREATE INDEX ix_care_camp_attendances_account_id ON care_camp_attendances (account_id);
CREATE INDEX ix_care_camp_attendances_camp_id ON care_camp_attendances (camp_id);
CREATE INDEX ix_care_catalog_provider_id ON care_catalog (provider_id);
CREATE INDEX ix_care_claim_requests_policy_id ON care_claim_requests (policy_id);
CREATE INDEX ix_care_claim_requests_account_id ON care_claim_requests (account_id);
CREATE INDEX ix_care_consultation_sessions_provider_id ON care_consultation_sessions (provider_id);
CREATE INDEX ix_care_consultation_sessions_student_id ON care_consultation_sessions (student_id);
CREATE INDEX ix_care_consultation_sessions_appointment_id ON care_consultation_sessions (appointment_id);
CREATE INDEX ix_care_contract_seats_contract_id ON care_contract_seats (contract_id);
CREATE INDEX ix_care_contract_seats_account_id ON care_contract_seats (account_id);
CREATE INDEX ix_care_crisis_events_created_at ON care_crisis_events (created_at);
CREATE INDEX ix_care_crisis_events_account_id ON care_crisis_events (account_id);
CREATE INDEX ix_care_crisis_events_kind ON care_crisis_events (kind);
CREATE INDEX ix_care_dispense_items_dispense_id ON care_dispense_items (dispense_id);
CREATE INDEX ix_care_dispense_items_prescription_item_id ON care_dispense_items (prescription_item_id);
CREATE INDEX ix_care_dispenses_created_at ON care_dispenses (created_at);
CREATE INDEX ix_care_dispenses_pharmacy_id ON care_dispenses (pharmacy_id);
CREATE INDEX ix_care_dispenses_status ON care_dispenses (status);
CREATE INDEX ix_care_dispenses_patient_id ON care_dispenses (patient_id);
CREATE INDEX ix_care_dispenses_prescription_id ON care_dispenses (prescription_id);
CREATE INDEX ix_care_document_intake_account_id ON care_document_intake (account_id);
CREATE INDEX ix_care_document_intake_document_id ON care_document_intake (document_id);
CREATE INDEX ix_care_documents_account_id ON care_documents (account_id);
CREATE INDEX ix_care_encounter_notes_account_id ON care_encounter_notes (account_id);
CREATE INDEX ix_care_encounter_notes_patient_id ON care_encounter_notes (patient_id);
CREATE INDEX ix_care_encounter_notes_appointment_id ON care_encounter_notes (appointment_id);
CREATE INDEX ix_care_enterprise_contracts_manager_account_id ON care_enterprise_contracts (manager_account_id);
CREATE INDEX ix_care_enterprise_inquiries_email ON care_enterprise_inquiries (email);
CREATE INDEX ix_care_exercise_sessions_account_id ON care_exercise_sessions (account_id);
CREATE INDEX ix_care_followup_tasks_account_id ON care_followup_tasks (account_id);
CREATE INDEX ix_care_followup_tasks_order_id ON care_followup_tasks (order_id);
CREATE INDEX ix_care_health_camp_stations_camp_id ON care_health_camp_stations (camp_id);
CREATE INDEX ix_care_intake_review_items_intake_id ON care_intake_review_items (intake_id);
CREATE INDEX ix_care_knowledge_chunks_source_id ON care_knowledge_chunks (source_id);
CREATE INDEX ix_care_lab_orders_sample_id ON care_lab_orders (sample_id);
CREATE INDEX ix_care_lab_orders_lab_id ON care_lab_orders (lab_id);
CREATE INDEX ix_care_lab_orders_prescription_id ON care_lab_orders (prescription_id);
CREATE INDEX ix_care_lab_orders_patient_id ON care_lab_orders (patient_id);
CREATE INDEX ix_care_lab_orders_ordered_by ON care_lab_orders (ordered_by);
CREATE INDEX ix_care_lab_orders_created_at ON care_lab_orders (created_at);
CREATE INDEX ix_care_lab_orders_status ON care_lab_orders (status);
CREATE INDEX ix_care_lab_orders_critical_flag ON care_lab_orders (critical_flag);
CREATE INDEX ix_care_medication_doses_plan_id ON care_medication_doses (plan_id);
CREATE INDEX ix_care_medication_doses_account_id ON care_medication_doses (account_id);
CREATE INDEX ix_care_medication_plans_account_id ON care_medication_plans (account_id);
CREATE INDEX ix_care_ops_events_severity ON care_ops_events (severity);
CREATE INDEX ix_care_ops_events_actor_id ON care_ops_events (actor_id);
CREATE INDEX ix_care_ops_events_subject_id ON care_ops_events (subject_id);
CREATE INDEX ix_care_ops_events_resource_id ON care_ops_events (resource_id);
CREATE INDEX ix_care_ops_events_created_at ON care_ops_events (created_at);
CREATE INDEX ix_care_ops_events_kind ON care_ops_events (kind);
CREATE INDEX ix_care_ops_events_domain ON care_ops_events (domain);
CREATE INDEX ix_care_ops_events_provider_id ON care_ops_events (provider_id);
CREATE INDEX ix_care_order_lines_provider_id ON care_order_lines (provider_id);
CREATE INDEX ix_care_order_lines_order_id ON care_order_lines (order_id);
CREATE INDEX ix_care_orders_account_id ON care_orders (account_id);
CREATE INDEX ix_care_orders_created_at ON care_orders (created_at);
CREATE INDEX ix_care_otp_challenges_identifier ON care_otp_challenges (identifier);
CREATE INDEX ix_care_outbox_events_account_id ON care_outbox_events (account_id);
CREATE UNIQUE INDEX ix_care_outbox_events_dedupe_key ON care_outbox_events (dedupe_key);
CREATE INDEX ix_care_payments_order_id ON care_payments (order_id);
CREATE UNIQUE INDEX ix_care_payments_idempotency_key ON care_payments (idempotency_key);
CREATE INDEX ix_care_policies_account_id ON care_policies (account_id);
CREATE INDEX ix_care_prescription_items_prescription_id ON care_prescription_items (prescription_id);
CREATE INDEX ix_care_prescriptions_status ON care_prescriptions (status);
CREATE INDEX ix_care_prescriptions_issued_at ON care_prescriptions (issued_at);
CREATE INDEX ix_care_prescriptions_patient_id ON care_prescriptions (patient_id);
CREATE INDEX ix_care_prescriptions_prescriber_id ON care_prescriptions (prescriber_id);
CREATE INDEX ix_care_prescriptions_encounter_id ON care_prescriptions (encounter_id);
CREATE INDEX ix_care_preventive_providers_name ON care_preventive_providers (name);
CREATE INDEX ix_care_preventive_report_reviews_assigned_clinician_id ON care_preventive_report_reviews (assigned_clinician_id);
CREATE INDEX ix_care_preventive_report_reviews_account_id ON care_preventive_report_reviews (account_id);
CREATE INDEX ix_care_preventive_vaccines_provider_id ON care_preventive_vaccines (provider_id);
CREATE INDEX ix_care_preventive_vaccines_pincode ON care_preventive_vaccines (pincode);
CREATE INDEX ix_care_preventive_vaccines_vaccine_name ON care_preventive_vaccines (vaccine_name);
CREATE INDEX ix_care_rate_buckets_expires_at ON care_rate_buckets (expires_at);
CREATE INDEX ix_care_readings_metric ON care_readings (metric);
CREATE INDEX ix_care_readings_account_id ON care_readings (account_id);
CREATE INDEX ix_care_readings_recorded_at ON care_readings (recorded_at);
CREATE INDEX ix_care_record_shares_owner_id ON care_record_shares (owner_id);
CREATE INDEX ix_care_record_shares_clinician_id ON care_record_shares (clinician_id);
CREATE INDEX ix_care_record_shares_document_id ON care_record_shares (document_id);
CREATE INDEX ix_care_service_providers_legal_name ON care_service_providers (legal_name);
CREATE INDEX ix_care_service_providers_account_id ON care_service_providers (account_id);
CREATE INDEX ix_care_service_providers_pincode ON care_service_providers (pincode);
CREATE INDEX ix_care_service_providers_kind ON care_service_providers (kind);
CREATE INDEX ix_care_sessions_account_id ON care_sessions (account_id);
CREATE INDEX ix_care_sessions_expires_at ON care_sessions (expires_at);
CREATE INDEX ix_care_substitution_requests_prescription_item_id ON care_substitution_requests (prescription_item_id);
CREATE INDEX ix_care_substitution_requests_created_at ON care_substitution_requests (created_at);
CREATE INDEX ix_care_substitution_requests_status ON care_substitution_requests (status);
CREATE INDEX ix_care_substitution_requests_dispense_id ON care_substitution_requests (dispense_id);
CREATE INDEX ix_care_support_requests_account_id ON care_support_requests (account_id);
CREATE INDEX ix_care_workflow_audit_created_at ON care_workflow_audit (created_at);
CREATE INDEX ix_care_workflow_audit_actor_id ON care_workflow_audit (actor_id);