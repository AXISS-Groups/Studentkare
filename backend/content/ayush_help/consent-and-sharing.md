---
id: consent-and-sharing
title: Consent, sharing a record and stopping a share
reviewed: 2026-10-22
keywords: share, sharing, share a report, share with a doctor, share my records, revoke, stop sharing, access, consent, permission, give access, रिकॉर्ड, शेयर, साझा, अनुमति, రికార్డ్, రికార్డు, రికార్డును, షేర్, పంచుకోవాలి, పంచుకోవడం, అనుమతి, डॉक्टर को रिकॉर्ड, వైద్యుడితో, డాక్టర్‌తో
---
<!--
Written from: /consent (src/features/vault/views/ConsentInboxBoard.tsx, copy sf.consent.*),
vault sharing (src/features/studentweb/views/t1/WebVaultView.tsx), and
backend/services/workflow_api.py POST /api/records/shares (1 to 90 days, default 7) and
POST /api/records/shares/{id}/revoke.
-->
You decide who can see your records. Open Consent (Who can see what) to see every active share. Every share has a scope, one document, and an end date.

To share a record with a doctor, open the document in your health vault and choose Share with a clinician. Enter the doctor's StudentKare account email and choose how many days they can see it, from 1 to 90 days. The doctor must have a doctor account on StudentKare.

To stop a share, choose Revoke now on it in Consent, or stop it from the document's menu in your vault. Revoking is immediate and needs no reason. The doctor loses access straight away. Revoking cannot un-read what was already opened: a note a doctor wrote stays in their own record, and the access log keeps both events.

Your campus health office is listed as Required. It can see your enrolment status only, never your records, because that standing is needed to use the app.

When someone asks for access to your records through StudentKare, the request appears in Consent under Awaiting you. Requests like that cannot be made yet, so there is nothing to approve there today.
