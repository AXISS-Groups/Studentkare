---
id: lab-tests
title: Booking a lab test and getting your report
reviewed: 2026-10-23
keywords: lab, lab test, blood test, sample, sample collection, pathology, test report, lab results, home collection, लैब, टेस्ट, जांच, ల్యాబ్, టెస్ట్, పరీక్ష
---
<!--
Written from: /lab-tests (src/features/m2store/views/M2LabsView.tsx, M2LabsRoute.tsx), lab bookings
under /prescriptions (src/screens/workspace/MyPrescriptionsPanel.tsx), the vault upload screen
/health/report-upload (src/features/labResults/views/M2ReportUploadView.tsx) and the doctor review
step for lab reports (backend/services/workflow_api.py lab orders, care.rx.awaitingReview), and the
Pay step and Awaiting payment state (src/features/labBooking/views/LabBookingOverlay.tsx, #225).
-->
Lab tests are booked from Lab tests. Search for a test or browse the tests you can book. Each test page names the lab that runs it, its accreditation, and when the report is due. If a test needs fasting, it says how many hours.

Booking works in four steps. You pick the tests and a collection slot. The sample is collected at your hostel block. The lab runs the tests. Your report arrives in your health vault.

You confirm and pay when you book. A test that is not paid yet shows Awaiting payment and is not sent to the lab; if online payment is not connected yet, the Pay step says so. Your lab bookings and their progress are listed under Prescriptions and lab tests. From there you can choose or change the collection time. If a sample could not be used, the booking says why and the laboratory arranges a new collection.

Each test page says when its report is due. When the lab result is ready, it first goes to a doctor. You are told when the doctor releases it, and then the report is in your health vault, with any note the doctor added.

Uploading a prescription from the Lab tests page is not available yet.

You can also add a report you already have, from a lab outside StudentKare. Open Add report in My health, upload a JPG, PNG or PDF, and type in its values. Nothing is saved until you tick and confirm each value. Your report stays in your vault and is never used to sell you anything.
