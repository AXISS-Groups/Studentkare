---
id: prescriptions
title: Prescriptions and uploading a prescription
reviewed: 2026-10-23
keywords: prescription, prescriptions, e-prescription, rx, upload a prescription, send to a pharmacy, dispense, paper prescription
---
<!--
Written from: /prescriptions (src/screens/workspace/MyPrescriptionsPanel.tsx), the vault upload
(src/features/studentweb/views/t1/WebVaultView.tsx "Upload a document", the phone
src/native/RecordCaptureScreen.tsx), backend/services/rx_uploads.py (no screen uses it yet),
and the shop's prescription-only refusal in backend/services/workflow_api.py.
-->
Prescriptions a doctor issues during a StudentKare consult appear under Prescriptions and lab tests. Each one shows its reference, the doctor's name and registration number, the date it was issued, the date it is valid until, and the medicines with their dose, how often, for how many days and the quantity. An expired prescription is marked Expired.

To have a prescription dispensed, choose Send to a pharmacy on it. Find the pharmacy in Find care, then paste the pharmacy's identifier. A pharmacist checks every prescription before anything is dispensed.

To upload a paper prescription you already have, add it to your health vault. On the website, open your vault and choose Upload a document: give it a name, choose the type Prescription, and pick a PDF, PNG or JPEG file up to 10 MB. Every file is checked for viruses before it is saved. On the phone app you can photograph it instead. Only you can see it until you share it. Sending an uploaded prescription to a pharmacy for review, and ordering prescription-only medicines in the shop, are not available in the app yet.

Ayush cannot read your prescriptions and cannot explain or change a dose. Ask the doctor who prescribed it, or your pharmacist, if anything on it is unclear.
