---
id: steps-water-reminders
title: Steps, water and medicine reminders
reviewed: 2026-10-22
keywords: steps, track my steps, step counter, pedometer, walking, health connect, apple health, google fit, fitness, water, water reminder, hydration, drink water, reminder, reminders, remind me, medicine reminder, pill reminder
---
<!--
Written from: /health/steps (src/features/steps/views, copy steps.*), /health/water
(src/features/reminders/views/M2WaterRoute.tsx, copy m2r.water.* and m2r.wrem.*), medicine reminders
(copy m2r.meds.*), and the wellness.* and meds.* settings in backend/core/settings_registry.py.
-->
Steps, Water and Medicines today are in My health. None of them is scored: there are no goals you are judged on, no streaks, no medals and no comparisons, and no one is told if you miss something.

Steps: in the phone app, connect Apple Health, Health Connect, or the phone's own motion sensor to count your steps automatically. StudentKare only reads your steps and distance and never writes anything back. You can stop reading a source at any time. On the website, or without a source, you can add today's steps yourself.

Water: tap Glass to log a glass, and Undo to remove the last one. Logging needs a connection, because nothing is kept on the device. Your daily goal starts as a suggestion, and you can change it to anything between {{setting:wellness.water_goal_ml_min}} ml and {{setting:wellness.water_goal_ml_max}} ml.

Water reminders work in the StudentKare phone app, which can remind you while it is closed. Turn them on and pick how often and between which hours. A reminder says only that it is time for water.

Medicine reminders: in Medicines today, mark each dose Taken or Skip, and undo a mark if you made a mistake. Your medicines come from your prescriptions or the ones you add; nothing is added for you. Reminders for a medicine can be turned on in the phone app, at morning, afternoon, evening or night times. A reminder never names the medicine, so nothing private shows on your lock screen.
