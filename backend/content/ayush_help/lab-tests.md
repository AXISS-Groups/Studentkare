---
id: lab-tests
title: Booking a lab test and getting your report
reviewed: 2026-10-22
---
<!--
Written from: /lab-tests (src/features/m2store/views/M2LabsView.tsx, M2LabsRoute.tsx), lab bookings
under /prescriptions (src/screens/workspace/MyPrescriptionsPanel.tsx), the vault upload screen
/health/report-upload (src/features/labResults/views/M2ReportUploadView.tsx) and the doctor review
step for lab reports (backend/services/workflow_api.py lab orders, care.rx.awaitingReview).
-->
Lab tests are booked from Lab tests. Search for a test or browse the tests you can book. Each test page names the lab that runs it, its accreditation, and when the report is due. If a test needs fasting, it says how many hours.

Booking works in four steps. You pick the tests and a collection slot. The sample is collected at your hostel block. The lab runs the tests. Your report arrives in your health vault.

Your lab bookings and their progress are listed under Prescriptions and lab tests. From there you can choose or change the collection time. If a sample could not be used, the booking says why and the laboratory arranges a new collection.

When the result is ready, it first goes to a doctor. You are told when the doctor releases it, and then the report is in your health vault, with any note the doctor added.

Uploading a prescription from the Lab tests page is not available yet.

You can also add a report you already have, from a lab outside StudentKare. Open Add report in My health, upload a JPG, PNG or PDF, and type in its values. Nothing is saved until you tick and confirm each value. Your report stays in your vault and is never used to sell you anything.
