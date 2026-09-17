"""
StudentKare — Branded HTML email templates.

All templates use the Impilo Pearl design system:
  Primary:  #524FD9   Text: #16165c   Canvas: #f4f4f6
  Positive: #007a55   Emergency: #b3241a   Surface: #ffffff

Each template returns (subject, html_body, plain_text) tuples.
"""

import os

BRAND_NAME = "StudentKare"
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000").rstrip("/")
PRIMARY = "#524FD9"
PRIMARY_DARK = "#4441b8"
TEXT_DARK = "#16165c"
TEXT_SECONDARY = "#4a4a63"
TEXT_MUTED = "#6d6d84"
CANVAS = "#f4f4f6"
SURFACE = "#ffffff"
BORDER = "#e6e6ee"
POSITIVE = "#007a55"
POSITIVE_BG = "#e6f7f1"
EMERGENCY = "#b3241a"
EMERGENCY_BG = "#fdf2f1"
ATTENTION = "#8a5200"
ATTENTION_BG = "#fef7e8"
FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
MONO_FONT = "'IBM Plex Mono', 'Courier New', monospace"


def _shell(content_html: str, preview_text: str = "") -> str:
    """Wrap content in the branded email shell."""
    preview = f'<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{preview_text}</div>' if preview_text else ''
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:{CANVAS};font-family:{FONT_STACK};">
  {preview}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{CANVAS};padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 28px 0;text-align:center;">
              <div style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,{PRIMARY},{PRIMARY_DARK});border-radius:12px;">
                <span style="font-size:17px;font-weight:800;color:#ffffff;letter-spacing:2px;">{BRAND_NAME.upper()}</span>
              </div>
            </td>
          </tr>

          <!-- Body Card -->
          <tr>
            <td style="background-color:{SURFACE};border-radius:16px;overflow:hidden;border:1px solid {BORDER};box-shadow:0 4px 24px rgba(22,22,92,0.06);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 36px 32px;color:{TEXT_DARK};font-size:15px;line-height:1.65;">
                    {content_html}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0 0 6px 0;color:{TEXT_MUTED};font-size:12px;line-height:1.6;">
                This is an automated message from <strong style="color:{TEXT_SECONDARY};">{BRAND_NAME}</strong>.
              </p>
              <p style="margin:0 0 4px 0;color:#d1d5db;font-size:11px;">
                A little care, right where you left it.
              </p>
              <p style="margin:0;color:#d1d5db;font-size:11px;">
                Questions? Visit <a href="{APP_BASE_URL}" style="color:{PRIMARY};text-decoration:none;">{APP_BASE_URL.replace("https://", "").replace("http://", "")}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _button(href: str, label: str, primary: bool = True) -> str:
    color = PRIMARY if primary else TEXT_SECONDARY
    return (
        f'<a href="{href}" style="display:inline-block;padding:14px 32px;background-color:{color};'
        f'color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;'
        f'margin:20px 0;">{label}</a>'
    )


def _divider() -> str:
    return f'<hr style="border:none;border-top:1px solid {BORDER};margin:24px 0;" />'


def _footer_note(text: str) -> str:
    return f'<p style="margin:16px 0 0 0;color:{TEXT_MUTED};font-size:12px;line-height:1.5;">{text}</p>'


# ─── OTP VERIFICATION CODE ────────────────────────────────────────────────

def otp_verification_email(code: str, expiry_minutes: int = 5) -> tuple:
    subject = f"Your {BRAND_NAME} verification code: {code}"
    plain = (
        f"Your {BRAND_NAME} verification code is {code}.\n"
        f"It expires in {expiry_minutes} minutes. Do not share it.\n"
        f"If you did not request this, ignore this email."
    )
    html = _shell(
        f"""
        <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:{TEXT_DARK};">Verify your email</h2>
        <p style="margin:0 0 24px 0;color:{TEXT_SECONDARY};font-size:14px;">
          Enter the 6-digit code below to continue signing in to {BRAND_NAME}.
        </p>

        <div style="background-color:{CANVAS};border-radius:12px;padding:24px;text-align:center;margin:0 0 24px 0;">
          <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:{PRIMARY};font-family:{MONO_FONT};">
            {code}
          </span>
        </div>

        <p style="margin:0 0 8px 0;color:{TEXT_SECONDARY};font-size:13px;">
          This code expires in <strong>{expiry_minutes} minutes</strong>. Do not share it with anyone.
        </p>
        {_footer_note("If you did not request this code, you can safely ignore this email. No changes will be made to your account.")}
        """,
        preview_text=f"Your {BRAND_NAME} verification code is {code}. It expires in {expiry_minutes} minutes."
    )
    return subject, html, plain


# ─── WELCOME / SIGNUP CONFIRMATION ────────────────────────────────────────

def welcome_email(full_name: str, role: str = "student") -> tuple:
    subject = f"Welcome to {BRAND_NAME}! Your account is ready"
    plain = (
        f"Hi {full_name},\n\n"
        f"Your {BRAND_NAME} account has been created successfully.\n"
        f"You can now access your health records, care services, and more.\n\n"
        f"Sign in at {APP_BASE_URL}"
    )
    role_label = role.replace("_", " ").title()
    html = _shell(
        f"""
        <div style="text-align:center;margin:0 0 24px 0;">
          <div style="display:inline-block;width:56px;height:56px;background-color:{POSITIVE_BG};border-radius:50%;line-height:56px;">
            <span style="font-size:28px;">✓</span>
          </div>
        </div>
        <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:{TEXT_DARK};text-align:center;">Welcome to {BRAND_NAME}</h2>
        <p style="margin:0 0 24px 0;color:{TEXT_SECONDARY};font-size:14px;text-align:center;">
          Hi {full_name}, your <strong>{role_label}</strong> account is ready.
        </p>

        <div style="background-color:{CANVAS};border-radius:12px;padding:20px;margin:0 0 24px 0;">
          <p style="margin:0 0 12px 0;color:{TEXT_DARK};font-size:14px;font-weight:700;">What you can do:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              <td style="padding:6px 0;color:{TEXT_SECONDARY};font-size:13px;">📋 Store and manage your health records</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:{TEXT_SECONDARY};font-size:13px;">💊 Request care from listed providers</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:{TEXT_SECONDARY};font-size:13px;">📊 Track your health metrics over time</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:{TEXT_SECONDARY};font-size:13px;">🛡️ Keep insurance details in one place</td>
            </tr>
          </table>
        </div>

        <div style="text-align:center;">
          {_button(f"{APP_BASE_URL}/login", "Sign in to your account")}
        </div>
        {_footer_note("Your records are private and stored securely. Only you can access your health data.")}
        """,
        preview_text=f"Welcome to {BRAND_NAME}, {full_name}! Your {role_label} account is ready."
    )
    return subject, html, plain


# ─── PASSWORD RESET / ACCOUNT RECOVERY ────────────────────────────────────

def password_reset_email(reset_link: str, expiry_minutes: int = 30) -> tuple:
    subject = f"Reset your {BRAND_NAME} password"
    plain = (
        f"We received a request to reset your {BRAND_NAME} password.\n"
        f"Click the link below to set a new password. This link expires in {expiry_minutes} minutes.\n\n"
        f"{reset_link}\n\n"
        f"If you did not request this, ignore this email."
    )
    html = _shell(
        f"""
        <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:{TEXT_DARK};">Reset your password</h2>
        <p style="margin:0 0 24px 0;color:{TEXT_SECONDARY};font-size:14px;">
          We received a request to reset the password on your {BRAND_NAME} account.
          Click the button below to set a new password.
        </p>

        <div style="text-align:center;">
          {_button(reset_link, "Set new password")}
        </div>

        <p style="margin:20px 0 0 0;color:{TEXT_SECONDARY};font-size:13px;">
          This link expires in <strong>{expiry_minutes} minutes</strong>.
        </p>
        {_footer_note("If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.")}
        """,
        preview_text=f"Reset your {BRAND_NAME} password. Link expires in {expiry_minutes} minutes."
    )
    return subject, html, plain


# ─── ORDER / REQUEST CONFIRMATION ─────────────────────────────────────────

def order_confirmation_email(full_name: str, order_id: str, items_summary: str, total: str) -> tuple:
    subject = f"{BRAND_NAME} — Request {order_id} confirmed"
    plain = (
        f"Hi {full_name},\n\n"
        f"Your request {order_id} has been confirmed.\n"
        f"Items: {items_summary}\n"
        f"Total: {total}\n\n"
        f"Track your request at {APP_BASE_URL}"
    )
    html = _shell(
        f"""
        <div style="text-align:center;margin:0 0 24px 0;">
          <div style="display:inline-block;width:56px;height:56px;background-color:{POSITIVE_BG};border-radius:50%;line-height:56px;">
            <span style="font-size:28px;">✓</span>
          </div>
        </div>
        <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:{TEXT_DARK};text-align:center;">Request confirmed</h2>
        <p style="margin:0 0 24px 0;color:{TEXT_SECONDARY};font-size:14px;text-align:center;">
          Hi {full_name}, your request <strong>{order_id}</strong> has been received.
        </p>

        <div style="background-color:{CANVAS};border-radius:12px;padding:20px;margin:0 0 24px 0;">
          <p style="margin:0 0 8px 0;color:{TEXT_DARK};font-size:14px;font-weight:700;">Order summary</p>
          <p style="margin:0 0 4px 0;color:{TEXT_SECONDARY};font-size:13px;">{items_summary}</p>
          <p style="margin:12px 0 0 0;color:{TEXT_DARK};font-size:16px;font-weight:800;">Total: {total}</p>
        </div>

        <div style="text-align:center;">
          {_button(f"{APP_BASE_URL}/orders", "Track your request")}
        </div>
        {_footer_note("Your provider will confirm the details shortly. You'll receive updates as your request progresses.")}
        """,
        preview_text=f"Your request {order_id} has been confirmed. Total: {total}."
    )
    return subject, html, plain


# ─── SUPPORT TICKET UPDATE ────────────────────────────────────────────────

def support_update_email(full_name: str, ticket_id: str, subject_line: str, status: str, message: str) -> tuple:
    email_subject = f"{BRAND_NAME} — Update on ticket {ticket_id}"
    plain = (
        f"Hi {full_name},\n\n"
        f"There's an update on your support ticket {ticket_id}: {subject_line}\n"
        f"Status: {status}\n"
        f"Message: {message}\n\n"
        f"View at {APP_BASE_URL}"
    )
    status_color = POSITIVE if status.upper() in ("RESOLVED", "COMPLETED") else PRIMARY
    html = _shell(
        f"""
        <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:{TEXT_DARK};">Support update</h2>
        <p style="margin:0 0 24px 0;color:{TEXT_SECONDARY};font-size:14px;">
          Hi {full_name}, there's an update on your support request.
        </p>

        <div style="background-color:{CANVAS};border-radius:12px;padding:20px;margin:0 0 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              <td style="padding:4px 0;color:{TEXT_MUTED};font-size:12px;font-weight:700;width:100px;">TICKET</td>
              <td style="padding:4px 0;color:{TEXT_DARK};font-size:13px;font-weight:700;">{ticket_id}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:{TEXT_MUTED};font-size:12px;font-weight:700;">SUBJECT</td>
              <td style="padding:4px 0;color:{TEXT_DARK};font-size:13px;">{subject_line}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:{TEXT_MUTED};font-size:12px;font-weight:700;">STATUS</td>
              <td style="padding:4px 0;">
                <span style="display:inline-block;padding:2px 10px;background-color:{status_color};color:#ffffff;font-size:11px;font-weight:700;border-radius:6px;">
                  {status.upper()}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="background-color:{SURFACE};border-left:3px solid {PRIMARY};padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px 0;">
          <p style="margin:0;color:{TEXT_SECONDARY};font-size:13px;line-height:1.6;">{message}</p>
        </div>

        <div style="text-align:center;">
          {_button(f"{APP_BASE_URL}/support", "View support request")}
        </div>
        """,
        preview_text=f"Update on ticket {ticket_id}: {status}"
    )
    return email_subject, html, plain


# ─── ACCOUNT DEACTIVATION / SECURITY ALERT ────────────────────────────────

def security_alert_email(full_name: str, action: str, details: str) -> tuple:
    subject = f"{BRAND_NAME} — Security alert: {action}"
    plain = (
        f"Hi {full_name},\n\n"
        f"A security action was performed on your account: {action}\n"
        f"Details: {details}\n\n"
        f"If this was not you, contact support immediately."
    )
    html = _shell(
        f"""
        <div style="text-align:center;margin:0 0 24px 0;">
          <div style="display:inline-block;width:56px;height:56px;background-color:{EMERGENCY_BG};border-radius:50%;line-height:56px;">
            <span style="font-size:28px;">🔒</span>
          </div>
        </div>
        <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:{EMERGENCY};text-align:center;">Security alert</h2>
        <p style="margin:0 0 24px 0;color:{TEXT_SECONDARY};font-size:14px;text-align:center;">
          Hi {full_name}, a security action was performed on your account.
        </p>

        <div style="background-color:{EMERGENCY_BG};border:1px solid {EMERGENCY};border-radius:12px;padding:20px;margin:0 0 24px 0;">
          <p style="margin:0 0 8px 0;color:{EMERGENCY};font-size:14px;font-weight:700;">{action}</p>
          <p style="margin:0;color:{TEXT_SECONDARY};font-size:13px;">{details}</p>
        </div>

        <div style="text-align:center;">
          {_button(f"{APP_BASE_URL}/support", "Contact support")}
        </div>
        {_footer_note("If you did not perform this action, contact our support team immediately. Do not share this email with anyone.")}
        """,
        preview_text=f"Security alert on your {BRAND_NAME} account: {action}"
    )
    return subject, html, plain
