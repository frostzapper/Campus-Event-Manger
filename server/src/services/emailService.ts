/**
 * Simulated email service with HTML templates.
 * In production replace with nodemailer / SendGrid / SES.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  /** Plain-text fallback */
  body: string;
  /** Optional HTML body (shown in sent-emails admin view) */
  html?: string;
  sentAt: string;
}

const sentEmails: EmailPayload[] = [];

// ── HTML template ─────────────────────────────────────────────────────────

function reminderIcon(window: '24h' | '1h' | 'now'): string {
  if (window === 'now') return '🚀';
  if (window === '1h')  return '⏰';
  return '📅';
}

function reminderColor(window: '24h' | '1h' | 'now'): string {
  if (window === 'now') return '#ef4444';
  if (window === '1h')  return '#f59e0b';
  return '#6c63ff';
}

export interface ReminderEmailOptions {
  to: string;
  displayName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  /** Which reminder window triggered this */
  window: '24h' | '1h' | 'now';
  /** deep-link back to the event, if available */
  eventUrl?: string;
}

export function buildReminderEmail(opts: ReminderEmailOptions): EmailPayload {
  const { to, displayName, eventTitle, eventDate, eventTime, eventLocation, window, eventUrl } = opts;

  const icon  = reminderIcon(window);
  const color = reminderColor(window);
  const windowLabel = window === '24h' ? '24 hours' : window === '1h' ? '1 hour' : 'right now';

  const subject =
    window === 'now'
      ? `${icon} "${eventTitle}" is starting now!`
      : `${icon} Reminder: "${eventTitle}" starts in ${windowLabel}`;

  const bodyText =
    `Hi ${displayName},\n\n` +
    `${subject}\n\n` +
    `📍 ${eventLocation}\n📅 ${eventDate} at ${eventTime}\n\n` +
    `${eventUrl ? `View event: ${eventUrl}\n\n` : ''}` +
    `See you there!\n— Campus Event Finder`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8f7ff;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(108,99,255,0.12);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${color} 0%,${color}cc 100%);padding:32px 32px 24px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">${icon}</div>
            <div style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;margin-bottom:6px;">
              ${window === 'now' ? 'Starting Now' : `In ${windowLabel}`}
            </div>
            <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;line-height:1.3;">${eventTitle}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
              Hi <strong>${displayName}</strong>,
              ${window === 'now'
                ? ` the event <strong>${eventTitle}</strong> is <strong style="color:${color}">starting right now</strong>! Head over before you miss it.`
                : ` just a reminder that <strong>${eventTitle}</strong> starts in <strong style="color:${color}">${windowLabel}</strong>.`}
            </p>

            <!-- Event Details Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;">
                        <span style="font-size:13px;color:#6b7280;">📅 Date &amp; Time</span><br/>
                        <strong style="font-size:15px;color:#1a1a2e;">${eventDate} at ${eventTime}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;">
                        <span style="font-size:13px;color:#6b7280;">📍 Location</span><br/>
                        <strong style="font-size:15px;color:#1a1a2e;">${eventLocation}</strong>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            ${eventUrl ? `
            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${eventUrl}"
                     style="display:inline-block;background:${color};color:#fff;font-size:15px;font-weight:700;
                            padding:14px 32px;border-radius:999px;text-decoration:none;
                            box-shadow:0 4px 16px rgba(0,0,0,0.15);">
                    View Event →
                  </a>
                </td>
              </tr>
            </table>` : ''}

            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
              You received this because you registered for this event.<br/>
              To manage reminder preferences, visit Campus Event Finder → ⚙️ Reminder Settings.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f1f0ff;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:12px;">🎓 Campus Event Finder &nbsp;·&nbsp; See you there!</span>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { to, subject, body: bodyText, html, sentAt: new Date().toISOString() };
}

export function sendEmail(payload: EmailPayload): void {
  console.log(`[EMAIL] To: ${payload.to} | Subject: ${payload.subject}`);
  sentEmails.push(payload);
}

/** Returns all simulated sent emails (useful for testing / admin view) */
export function getSentEmails(): EmailPayload[] {
  return [...sentEmails];
}

/** Clear the sent-email log (useful in tests) */
export function clearSentEmails(): void {
  sentEmails.length = 0;
}
