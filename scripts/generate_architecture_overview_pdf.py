#!/usr/bin/env python3
"""Generate Studentkare System Architecture & Features PDF report with ReportLab."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)

OUT_DOCS = "docs/Studentkare_System_Architecture_Overview.pdf"
OUT_ROOT = "studentkare_architecture_design.pdf"
OUT_ARTIFACT = "/Users/avks/.gemini/antigravity-ide/brain/b42314ab-fe08-4941-bea7-fc3eeb4a38c4/Studentkare_System_Architecture_Overview.pdf"

# Style setup
styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    'TitleX', parent=styles['Title'], fontSize=22, leading=26,
    textColor=colors.HexColor('#1e1b4b'), spaceAfter=4, alignment=0
)
subtitle_style = ParagraphStyle(
    'SubtitleX', parent=styles['Normal'], fontSize=11,
    leading=15, textColor=colors.HexColor('#4f46e5'), spaceAfter=8
)
h1 = ParagraphStyle(
    'H1', parent=styles['Heading1'], fontSize=14, leading=18,
    textColor=colors.HexColor('#4f46e5'), spaceBefore=14, spaceAfter=6
)
h2 = ParagraphStyle(
    'H2', parent=styles['Heading2'], fontSize=11, leading=14,
    textColor=colors.HexColor('#1e1b4b'), spaceBefore=8, spaceAfter=4
)
body = ParagraphStyle(
    'Body', parent=styles['Normal'], fontSize=9.5, leading=14,
    textColor=colors.HexColor('#374151')
)
small = ParagraphStyle(
    'Small', parent=styles['Normal'], fontSize=8.5, leading=12,
    textColor=colors.HexColor('#6b7280')
)
table_header = ParagraphStyle(
    'TH', parent=styles['Normal'], fontSize=9, leading=12,
    textColor=colors.white, fontName='Helvetica-Bold'
)
table_cell = ParagraphStyle(
    'TC', parent=styles['Normal'], fontSize=8.5, leading=12,
    textColor=colors.HexColor('#1f2937')
)

INDIGO = colors.HexColor('#4f46e5')
INDIGO_DARK = colors.HexColor('#1e1b4b')
INDIGO_LIGHT = colors.HexColor('#eef2ff')
BG_ALT = colors.HexColor('#f9fafb')
BORDER = colors.HexColor('#e5e7eb')

def build_pdf(filename):
    os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    story = []

    # Title block
    story.append(Paragraph("Studentkare — System Architecture &amp; Features", title_style))
    story.append(Paragraph("End-to-End Application Architecture, User Workspaces, Features &amp; AI Agent Mesh", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=INDIGO))
    story.append(Spacer(1, 10))

    # Architecture Overview Table
    summary_data = [
        [Paragraph("<b>Component / Area</b>", table_header), Paragraph("<b>Key Scope / Highlights</b>", table_header), Paragraph("<b>Target User / Role</b>", table_header)],
        [Paragraph("<b>Student Care Workspace</b>", table_cell), Paragraph("ABHA Health Vault, Marketplace, rPPG Vitals, Teleconsultation, Health Camp Day", table_cell), Paragraph("STUDENT", table_cell)],
        [Paragraph("<b>Clinician EMR Console</b>", table_cell), Paragraph("Patient triage queue, EMR timeline, FHIR observations, clinical notes &amp; CDSCO drug checks", table_cell), Paragraph("NMC_DOCTOR", table_cell)],
        [Paragraph("<b>Vendor Partner Console</b>", table_cell), Paragraph("Diagnostic lab home collections, pharmacy delivery fulfillment, catalog pricing", table_cell), Paragraph("VENDOR", table_cell)],
        [Paragraph("<b>Campus Admin Console</b>", table_cell), Paragraph("Hostel health velocity, early outbreak alerts, health camp station planning", table_cell), Paragraph("CAMPUS_ADMIN", table_cell)],
        [Paragraph("<b>Super Admin Plane</b>", table_cell), Paragraph("Operations telemetry, Razorpay/Stripe billing, institutional contracts, VAVE Pen-Test gate", table_cell), Paragraph("SUPER_ADMIN", table_cell)],
        [Paragraph("<b>AI Agent Mesh</b>", table_cell), Paragraph("9 Departmental Agents (D1-D9) + Crisis Gate, Outbreak Predictor, CDSCO &amp; DPDP Reconciler", table_cell), Paragraph("AUTONOMOUS", table_cell)],
    ]
    t = Table(summary_data, colWidths=[1.8*inch, 3.7*inch, 1.4*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), INDIGO),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_ALT]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # Section 1: End-to-End User Workspaces & Flows
    story.append(Paragraph("1. Role-Based Workspaces &amp; User Flows", h1))
    story.append(Paragraph("<b>A. Student Care Workspace (/health, /shop, /digital-id, /records, /insurance)</b><br/>"
                           "• <i>Onboarding &amp; Digital Health Card:</i> Phone/WhatsApp OTP authentication + campus roster matching. Generates an ABHA-linked QR card with zero-login emergency trauma profile.<br/>"
                           "• <i>Health Vault &amp; Provenance:</i> Uploads lab reports and prescriptions with OCR LOINC/SNOMED extraction and provenance bounding-box highlights.<br/>"
                           "• <i>Marketplace:</i> Orders medicines, books lab test packages (pickup or home collection), and schedules teleconsultations.<br/>"
                           "• <i>Vitals &amp; Prevention:</i> Smartphone camera rPPG vital signs scanning (heart rate, HRV, respiration) + Apple Health / Android Health Connect background sync.<br/>"
                           "• <i>Health Camp Day:</i> Station-by-station checkups (Dental, Vision, GP) to earn digital wellness badges.", body))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>B. Clinician EMR Console (/clinician, /clinical-notes, /report-reviews)</b><br/>"
                           "• Triage queue with chief complaints and urgency scores.<br/>"
                           "• Historical lab trend charts, FHIR observations, and OCR document verification.<br/>"
                           "• Clinical note authoring with CDSCO drug recall guards and drug interaction safety checks.", body))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>C. Vendor &amp; Diagnostic Partner Console (/vendor)</b><br/>"
                           "• Order fulfillment tracking from sample collection through lab report upload.<br/>"
                           "• Real-time order state progression (<i>created → assigned → sample_collected → completed</i>).", body))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>D. Campus Admin &amp; Super Admin Planes (/campus, /admin)</b><br/>"
                           "• Aggregate hostel health velocity monitoring and early viral outbreak warnings.<br/>"
                           "• Razorpay &amp; Stripe subscription billing reconciliation, institutional seat contracts, and VAVE zero-trust pen-test safety logs.", body))
    story.append(Spacer(1, 12))

    # Section 2: AI Agent Mesh
    story.append(Paragraph("2. The 9-Department AI Agent Mesh &amp; Specialist Agents", h1))
    story.append(Paragraph("StudentKare operates an autonomous AI system governed by a clinical constitution (<i>constitution.ts</i>):", body))
    story.append(Spacer(1, 6))

    agents_data = [
        [Paragraph("<b>Department / Agent</b>", table_header), Paragraph("<b>Autonomous Function &amp; Responsibility</b>", table_header)],
        [Paragraph("<b>D1 Service Desk</b>", table_cell), Paragraph("Automated ticket triage, issue escalation, and user support routing.", table_cell)],
        [Paragraph("<b>D2 Partner Ops</b>", table_cell), Paragraph("Diagnostic lab SLA monitoring and delivery partner fulfillment checks.", table_cell)],
        [Paragraph("<b>D3 Compliance</b>", table_cell), Paragraph("Enforces DPDP statutory erasure, CDSCO drug recalls, and FSSAI mess audits.", table_cell)],
        [Paragraph("<b>D4 Finance &amp; Revenue</b>", table_cell), Paragraph("Subscription billing reconciliation, Razorpay/Stripe webhook verification, and seat limits.", table_cell)],
        [Paragraph("<b>D5 Claims Ops</b>", table_cell), Paragraph("M22–M25 insurance claim adjudication, fraud anomaly detection, and signature checks.", table_cell)],
        [Paragraph("<b>D6 Institution Success</b>", table_cell), Paragraph("University onboarding, student seat allocation, and aggregate telemetry reporting.", table_cell)],
        [Paragraph("<b>D7 Localization</b>", table_cell), Paragraph("Multi-lingual translation (English, Hindi, Telugu) and health guide adaptation.", table_cell)],
        [Paragraph("<b>D8 Engineering</b>", table_cell), Paragraph("Connection pool tracking, VAVE zero-trust gate enforcement, and error rate tracking.", table_cell)],
        [Paragraph("<b>D9 Clinical Governance</b>", table_cell), Paragraph("LOINC/SNOMED coding validation, drug-drug interaction gates, and allergy cross-checks.", table_cell)],
        [Paragraph("<b>Crisis Gate Agent</b>", table_cell), Paragraph("Detects self-harm keywords, locks AI response, and displays 24x7 crisis helplines.", table_cell)],
        [Paragraph("<b>Outbreak Predictor</b>", table_cell), Paragraph("Monitors hostel pyrexia velocity (R0 transmission estimate) to flag viral outbreaks.", table_cell)],
        [Paragraph("<b>CDSCO Recall Guard</b>", table_cell), Paragraph("Cross-checks prescribed drugs against active Drug Controller General India recall notices.", table_cell)],
        [Paragraph("<b>DPDP Erasure Agent</b>", table_cell), Paragraph("Reconciles data erasure requests across ABDM Gateway HIP/HIU nodes within 72h SLA.", table_cell)],
    ]
    at = Table(agents_data, colWidths=[2.0*inch, 4.9*inch])
    at.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), INDIGO),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_ALT]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(at)
    story.append(Spacer(1, 12))

    # Section 3: Key Domain Entities & Catalogs
    story.append(Paragraph("3. Core Domain Entities &amp; Data Structures", h1))
    entities_data = [
        [Paragraph("<b>Entity</b>", table_header), Paragraph("<b>Key Attributes</b>", table_header), Paragraph("<b>Primary Usage</b>", table_header)],
        [Paragraph("<b>StudentProfile</b>", table_cell), Paragraph("id, fullName, phone, bloodGroup, abhaId, emergencyContact, allergies, pointsBalance", table_cell), Paragraph("Digital Health Card &amp; Student Portal", table_cell)],
        [Paragraph("<b>HealthRecord</b>", table_cell), Paragraph("id, category (LAB, PRESCRIPTION, VACCINE, CAMP_REPORT), documentUrl, fhirObservations, provenance", table_cell), Paragraph("Health Vault &amp; OCR Provenance", table_cell)],
        [Paragraph("<b>CatalogItem</b>", table_cell), Paragraph("id, name, pack, category (PRODUCT, LAB, CONSULTATION), pricePaise, mrpPaise, stock", table_cell), Paragraph("Healthcare Marketplace", table_cell)],
        [Paragraph("<b>FabricOrder</b>", table_cell), Paragraph("id, partnerName, serviceCategory, modality (HOME_COLLECTION, PICKUP), state, providerCost", table_cell), Paragraph("Health Services Fabric", table_cell)],
        [Paragraph("<b>ClaimAdjudication</b>", table_cell), Paragraph("id, policyNumber, claimantName, amountClaimedPaise, anomalyFlags, decisionStatus", table_cell), Paragraph("Insurance &amp; Claims Hub", table_cell)],
        [Paragraph("<b>HealthCamp</b>", table_cell), Paragraph("id, title, campusName, date, totalStations, completedCount, stations", table_cell), Paragraph("Campus Health Camp Day", table_cell)],
    ]
    et = Table(entities_data, colWidths=[1.5*inch, 3.8*inch, 1.6*inch])
    et.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), INDIGO),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_ALT]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(et)
    story.append(Spacer(1, 16))

    story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    story.append(Spacer(1, 6))
    story.append(Paragraph("© Studentkare — Official System Architecture &amp; Features Guide", small))

    doc.build(story)
    print(f"Generated PDF: {filename}")

if __name__ == "__main__":
    build_pdf(OUT_DOCS)
    build_pdf(OUT_ROOT)
    build_pdf(OUT_ARTIFACT)
