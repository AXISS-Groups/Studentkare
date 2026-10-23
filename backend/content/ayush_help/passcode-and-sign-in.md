---
id: passcode-and-sign-in
title: Signing in, passcode and password
reviewed: 2026-10-23
keywords: login, log in, cannot log in, sign in, signin, otp, otp not received, code not received, password, forgot password, reset password, change password, passcode, forgot passcode, pin, locked, locked out, लॉगिन, पासवर्ड, पासकोड, ओटीपी, లాగిన్, పాస్‌వర్డ్, పాస్‌కోడ్, ఓటీపీ
---
<!--
Written from: sign-in (src/features/auth, copy authpc.* and authpw.*), Sign-in & security
(/security, SignInSecurityRoute), backend/services/workflow_auth.py (OTP send limit of 3 codes per
5 minutes), backend/services/student_passcode.py, backend/services/account_password.py and the
auth.* settings in backend/core/settings_registry.py.
-->
You sign in (log in) to StudentKare with a one-time code, an OTP. Type your email or WhatsApp number and choose to get a code, then enter the 6-digit code you receive. If a code does not arrive, wait for the screen to offer a new one. At most 3 codes can be sent to one email or number in 5 minutes.

A passcode is an optional, quicker way in. You can set a passcode of 4, 6 or 8 characters in Sign-in and security. It works only on a device that has signed in to your account before; on a new device, use a code. After {{setting:auth.passcode_max_attempts}} wrong passcodes in a row, your passcode is locked for {{setting:auth.passcode_lockout_minutes}} minutes, but a code still works. Forgot your passcode? Sign in with a code instead. Right after signing in with a code, you can replace or remove your passcode without the old one.

A password works on any device. It must be at least {{setting:auth.password_min_length}} characters. When your password is used on a new device, we tell your email and WhatsApp. Forgot your password? Sign in with a code instead.

At sign-up we verify both your email and your WhatsApp number when both can receive codes, so you can sign in with either and get back in if you lose one.

Signing out keeps your records, orders and bookings exactly as they are. Emergency 112 and Tele-MANAS 14416 work even when you are signed out.
