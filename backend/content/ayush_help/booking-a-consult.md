---
id: booking-a-consult
title: Booking a doctor consult
reviewed: 2026-10-23
keywords: consult, physician, consult a doctor, consultation, appointment, book a doctor, see a doctor, talk to a doctor, speak to a doctor, video call, video consult, online doctor, teleconsultation, schedule, reschedule, cancel appointment, slot, doctor appointment, डॉक्टर, अपॉइंटमेंट, बुक, परामर्श, कंसल्ट, డాక్టర్, వైద్యుడు, అపాయింట్‌మెంట్, బుక్, కన్సల్ట్
---
<!--
Written from: /care (src/features/m2store/views/M2ConsultsRoute.tsx, M2ConsultsView.tsx),
the booking dialog (src/screens/workspace/AppointmentsPanel.tsx BookAppointmentDialog),
/appointments, /find-care Doctors tab, and the server rules in
backend/services/workflow_api.py POST /api/appointments and PATCH /api/appointments/{id}.
-->
To book a doctor consult, open Doctor consults (Care in the app menu). It lists the doctors who are taking bookings, with each doctor's price and their next free slot, so you see both before you book. You can also find doctors under Find care, on the Doctors tab.

Choose Book next to a doctor. Pick the consultation service, a date, and one of the open time slots, then choose Request this appointment. Sending the request holds that slot for you. The doctor or provider then confirms or declines it, and only a confirmed request becomes an appointment. No payment is collected in the booking step.

If no slot is shown, that doctor has not published any slots for that service and date yet. Try another date or another doctor.

Your bookings are listed under Appointments, with their status: requested, confirmed, completed or cancelled. You can cancel a requested or a confirmed appointment yourself from Appointments, and the slot is released for someone else. Only the doctor can mark an appointment confirmed or completed.

Consults are video consults. A consult is private between you and your doctor, and your campus never sees what you discussed. If the doctor prescribes a medicine or a test, it is added to your e-prescription, which appears under Prescriptions and in your health vault.

Not happy with a consult? Raise it from Help (Support), and a support person gets back to you.
