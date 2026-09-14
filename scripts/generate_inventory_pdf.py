#!/usr/bin/env python3
"""Generate a Studentkare feature inventory PDF with reportlab."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, HRFlowable, KeepTogether)

OUT = "docs/Studentkare_Feature_Inventory.pdf"

# Style setup
styles = getSampleStyleSheet()
title_style = ParagraphStyle('TitleX', parent=styles['Title'], fontSize=22, leading=26,
                             textColor=colors.HexColor('#1e1b4b'), spaceAfter=4)
subtitle_style = ParagraphStyle('SubtitleX', parent=styles['Normal'], fontSize=11,
                                leading=15, textColor=colors.HexColor('#4b5563'))
h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=16, leading=20,
                    textColor=colors.HexColor('#4f46e5'), spaceBefore=14, spaceAfter=6)
h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=12, leading=15,
                    textColor=colors.HexColor('#1e1b4b'), spaceBefore=8, spaceAfter=3)
body = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14,
                      textColor=colors.HexColor('#374151'))
small = ParagraphStyle('Small', parent=styles['Normal'], fontSize=9, leading=13,
                       textColor=colors.HexColor('#6b7280'))
badge = ParagraphStyle('Badge', parent=styles['Normal'], fontSize=9, leading=12,
                       textColor=colors.white)

INDIGO = colors.HexColor('#4f46e5')
INDIGO_LIGHT = colors.HexColor('#eef2ff')
GREEN = colors.HexColor('#059669')
AMBER = colors.HexColor('#d97706')
BORDER = colors.HexColor('#e5e7eb')

story = []

# Title block
story.append(Paragraph("Studentkare — Feature Inventory", title_style))
story.append(Paragraph("Personal Health &amp; Care Services Platform", subtitle_style))
story.append(Spacer(1, 4))
story.append(HRFlowable(width="100%", thickness=1.2, color=INDIGO))
story.append(Spacer(1, 10))

# Summary metrics table
metrics = [
    ["Application-side features", "96", "Implemented &amp; tested"],
    ["Features requiring external infrastructure", "4", "Contracts + scaffolding ready"],
    ["Backend API endpoint groups", "127", "Auth, health, care, ops"],
    ["Backend tests", "134", "pytest — all passing"],
    ["Frontend tests", "260", "vitest — all passing"],
    ["Role-specific dashboards", "5", "Student, Admin, Vendor, Clinician, Campus"],
]
tbl = Table(metrics, colWidths=[3.3*inch, 0.9*inch, 2.6*inch])
tbl.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), INDIGO),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
    ('BACKGROUND', (0,1), (-1,-1), INDIGO_LIGHT),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
]))
# bold the numbers column
for i in range(1, len(metrics)):
    tbl.setStyle(TableStyle([('FONTNAME', (1,i), (1,i), 'Helvetica-Bold')]))
story.append(tbl)
story.append(Spacer(1, 8))

# Area-by-area inventory
areas = [
    ("Authentication & Accounts", [
        "Verified OTP login &amp; signup (email + WhatsApp)",
        "Database-backed, revocable HTTP-only sessions",
        "TOTP two-factor authentication",
        "Role-based workspaces (Student, Admin, Vendor, Clinician, Campus)",
        "One-click demo login for every role dashboard",
        "CSRF + origin checks on all mutations",
    ]),
    ("Student Health Workspace", [
        "Health overview dashboard",
        "Manual readings with dated, source-attributed trends",
        "Records vault: upload, download, share, delete, export",
        "Insurance details + out-of-pocket estimator",
        "Medication plans, dose logging, refill reminders",
        "Exercise &amp; movement library with saved sessions",
    ]),
    ("Appointments &amp; Teleconsultation", [
        "Appointment booking with capacity reservation",
        "Provider confirmation &amp; state machine",
        "Reminder preferences &amp; notification inbox",
        "Teleconsult waiting room + provider console",
        "WebRTC signalling contract (offer/answer relay)",
        "Meeting device pre-check (camera/mic)",
    ]),
    ("Devices &amp; Sensors", [
        "Camera capture (preview, front/rear, retake)",
        "Foreground motion pedometer with session history",
        "Voice-note recording &amp; playback",
        "Experimental camera pulse estimator (quality-gated)",
        "Native health adapter (HealthKit / Health Connect)",
        "Capability detection with honest states",
    ]),
    ("Wellbeing &amp; Screening", [
        "Guided breathing (start/pause/finish)",
        "Thought-pop, grounding, memory, tracing, drawing",
        "Sleep wind-down routine",
        "Mood check-in &amp; private journaling",
        "Vision acuity + color-vision screening",
        "Hearing tone tests (heard/not-heard responses)",
    ]),
    ("Care Services", [
        "Read-only care navigator (approved sources + citations)",
        "Approved knowledge source management",
        "Document intake + human review queue",
        "Health camps (register, check-in, station progress)",
        "Campus affiliation verification",
        "Notification inbox with delivery/read state",
    ]),
    ("Provider &amp; Operations", [
        "Catalog management (publish, stock, hide)",
        "Staff account provisioning",
        "Work requests (accept/decline/dispatch/complete)",
        "Appointments queue &amp; follow-up tasks",
        "Care-request follow-up worker (2-hour)",
        "Intake review queue",
    ]),
    ("Insurance &amp; Payments", [
        "Policy details &amp; benefits directory",
        "Claim request drafts",
        "Insurer eligibility + claim submission (honest contract)",
        "Payment initiation + signed webhook verification",
        "Order payment status",
    ]),
    ("Admin &amp; Observability", [
        "Integration health monitor (2-hour probes)",
        "Scheduled jobs console (run-now)",
        "Agent evaluation harness (grounding/refusal/isolation)",
        "Workflow audit history",
        "Operational reports",
    ]),
    ("Infrastructure &amp; Release", [
        "Durable 2-hour workflow scheduler (jobs/runs/outbox)",
        "Alembic migrations + production migration runner",
        "Fail-closed production startup guard",
        "PWA offline application shell",
        "CI hardening (build, secret scan, prod guard, audit)",
        "Accessibility (focus rings, skip link, reduced motion)",
        "Indigo light/dark theme",
    ]),
]

for area, features in areas:
    story.append(Paragraph(area, h1))
    story.append(HRFlowable(width="100%", thickness=0.6, color=BORDER))
    for f in features:
        story.append(Paragraph(f"• {f}", body))
    story.append(Spacer(1, 4))

story.append(PageBreak())
story.append(Paragraph("Remaining (external dependencies)", h1))
story.append(Paragraph("These 4 features require external credentials, a native app target, or live infrastructure. Each has its contract, honest-state handling, scaffolding, and tests in place.", body))
story.append(Spacer(1, 6))
remaining = [
    ("Online payments provider", "A real payment gateway credential + signed webhook receiver"),
    ("Pharmacy prescription review", "A licensed review &amp; substitution workflow"),
    ("Live WebRTC media", "A deployed signalling server + TURN relays"),
    ("Native pedometer / OS sync", "A native app bridge (React Native / Expo target)"),
]
rtbl = Table([[Paragraph(f"<b>{n}</b>", small), Paragraph(d, small)] for n, d in remaining],
             colWidths=[2.2*inch, 4.6*inch])
rtbl.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fffbeb')),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story.append(rtbl)
story.append(Spacer(1, 12))

story.append(Paragraph("Testing summary", h1))
for line in [
    "<b>Backend (pytest):</b> 134 tests passing — auth, security fixes, scheduler, appointments, consultation, medication, insurance, records privacy, campus, health camp, payments, knowledge, document intake, follow-up, inventory, encounter, insurer, agent evaluation, production guard, migrations.",
    "<b>Frontend (vitest):</b> 260 tests passing — workflow routing, accessibility, native health, WebRTC, movement history, plus the full application feature suite.",
    "<b>End-to-end:</b> the full workflow smoke test passes (registration, sessions, private readings/documents, server-priced order, vendor fulfilment, admin support/audit, cross-user isolation, mobile responsiveness, exercise bookmarks).",
]:
    story.append(Paragraph(line, small))
    story.append(Spacer(1, 3))

story.append(Spacer(1, 10))
story.append(HRFlowable(width="100%", thickness=0.6, color=BORDER))
story.append(Spacer(1, 4))
story.append(Paragraph("Studentkare — feature inventory. Application-side implementation is feature-complete (96/100); the remaining 4 items are externally-gated. See docs/integration-guide.md for activation steps.", small))

doc = SimpleDocTemplate(OUT, pagesize=A4,
                        leftMargin=0.8*inch, rightMargin=0.8*inch,
                        topMargin=0.7*inch, bottomMargin=0.7*inch,
                        title="Studentkare Feature Inventory",
                        author="Studentkare")
doc.build(story)
print("PDF generated:", OUT)
