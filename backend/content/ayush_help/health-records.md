---
id: health-records
title: Your health vault: adding records and folders
reviewed: 2026-11-14
keywords: health vault, vault, records, my records, health records, upload report, add document, upload document, folder, folders, move to a folder, not sorted, blood tests folder, duplicate, same file twice, download report, export all, where is my report, रिकॉर्ड, रिपोर्ट अपलोड, फ़ोल्डर, రికార్డులు, రిపోర్ట్ అప్‌లోడ్, ఫోల్డర్
---
<!--
Written from: the vault screen /records (src/features/vault/views/HealthVaultView.tsx, copy swt.vault.*),
the upload endpoint and duplicate check (backend/services/workflow_api.py upload_document,
backend/services/document_filing.py), folder rules (backend/services/document_classifier.py KINDS) and
docs/plans/tier1-document-autofile-2026-11-13.md. Checked in a browser by e2e/03-records-privacy.spec.ts.
-->
Your health vault keeps your reports, prescriptions and vaccination documents in one place. Open Health vault from the menu. Reports and prescriptions from a visit or a lab test booked on StudentKare land there on their own, and you can add older ones yourself.

To add a record, choose Upload a document, or Add a document if your vault already has some. The file can be a PDF, PNG or JPEG of up to 10 MB. Every file is checked for viruses before it is saved. Only you can see a record until you share it, and it is never used to sell you anything.

Each record is filed into a folder so it is easy to find later. Lab reports are sorted into Blood tests, Urine tests, X-rays, MRI, CT scans, Ultrasound, Heart tests and Reports. Other types have folders such as Prescriptions, Consultation notes, Certificates, Vaccination cards, Camp reports, Discharge summaries, Insurance, Bills and ID proofs. StudentKare picks the folder from the file's name. If the name does not say what the record is, it goes to Not sorted.

To change the folder, choose Move to a folder on the record and pick the right one. StudentKare remembers your choice for files with the same name, so the next one goes to the folder you picked.

If you add the same file twice under the same type, it is kept once. You will not get a second copy.

To get a copy of a record, choose Download on it. On the website, Export all downloads your whole vault.

Nobody else can open your records unless you share them. To share one with a doctor, or to stop a share, see Consent, sharing a record and stopping a share. Ayush cannot read anything in your vault.
