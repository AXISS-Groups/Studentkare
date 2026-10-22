---
id: campus-verification
title: How campus verification works
reviewed: 2026-10-23
keywords: verify, verification, verify my college, college, campus, roll number, student id, id card, verified student, कैंपस, वेरिफ़िकेशन, वेरिफिकेशन, सत्यापन, कॉलेज, క్యాంపస్, వెరిఫికేషన్, ధృవీకరణ, కాలేజీ
---
<!--
Written from: /verify (src/features/auth/views/IdentityVerifyView.tsx and IdentityVerifyPanel.tsx,
copy ident.* and verify.*), and backend/services/workflow_api.py GET/POST /api/campus/verification
and PATCH /api/ops/campus/{account_id} (a campus administrator verifies or rejects); sign-up opens the
request (backend/services/workflow_auth.py signup, #225).
-->
Campus verification confirms that you are a student at your college. Open Verify it's you (Identity verification in the menu) to see which checks are done. Services that need a verified student check this first.

To verify your campus, submit your college and your roll number from your profile on the StudentKare website. If you gave your college and roll number when you signed up, that request is already open. Your submission is then pending until a campus administrator at your college reviews it and marks it verified or rejected. You are told when it is verified. If you change your college or roll number later, it has to be reviewed again.

Your college sees your name and roll number, never your health records. Partners and advertisers see none of it.

Photo checks, checking an email address for identity, and government ID checks are not available yet; they show as Not available yet. StudentKare will never ask you to type your full Aadhaar number.

If you skip verification, nothing is lost. Crisis support, SOS, your emergency card and the help centre always work, with or without verification. Services that need a verified student will ask you to finish it first.
