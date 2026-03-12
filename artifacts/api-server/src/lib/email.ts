import { getAppBaseUrl } from "./appDomain";

export interface InvitationEmailParams {
  recipientEmail: string;
  teamName: string;
  inviterName: string;
  role: string;
  token: string;
}

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  admin: { en: "Admin", ar: "مدير" },
  developer: { en: "Developer", ar: "مطور" },
  reviewer: { en: "Reviewer", ar: "مراجع" },
  viewer: { en: "Viewer", ar: "مشاهد" },
};

export async function sendInvitationEmail(params: InvitationEmailParams): Promise<boolean> {
  const { recipientEmail, teamName, inviterName, role, token } = params;
  const baseUrl = getAppBaseUrl();
  const acceptUrl = `${baseUrl}/teams?invite=${token}`;
  const roleLabel = ROLE_LABELS[role] || { en: role, ar: role };

  const subject = `You've been invited to join "${teamName}" | تمت دعوتك للانضمام إلى "${teamName}"`;
  const htmlBody = `
<!DOCTYPE html>
<html dir="ltr">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
  <div style="background: #0a0a0f; color: #ffffff; padding: 40px; border-radius: 16px;">
    <h1 style="color: #a78bfa; margin: 0 0 8px;">Team Invitation</h1>
    <p style="color: #999; margin: 0 0 24px;">دعوة فريق</p>
    
    <p style="color: #e0e0e0; line-height: 1.6;">
      <strong>${inviterName}</strong> has invited you to join the team <strong>"${teamName}"</strong> as a <strong>${roleLabel.en}</strong>.
    </p>
    <p style="color: #999; line-height: 1.6; direction: rtl; text-align: right;">
      دعاك <strong>${inviterName}</strong> للانضمام إلى فريق <strong>"${teamName}"</strong> بدور <strong>${roleLabel.ar}</strong>.
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${acceptUrl}" style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
        Accept Invitation / قبول الدعوة
      </a>
    </div>
    
    <p style="color: #666; font-size: 12px; margin-top: 24px;">
      This invitation expires in 7 days. | تنتهي صلاحية هذه الدعوة خلال 7 أيام.
    </p>
    <p style="color: #444; font-size: 11px; margin-top: 16px; word-break: break-all;">
      If the button doesn't work, copy this link: ${acceptUrl}
    </p>
  </div>
</body>
</html>`;

  if (process.env.SMTP_HOST || process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY) {
    try {
      if (process.env.RESEND_API_KEY) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "noreply@example.com",
            to: recipientEmail,
            subject,
            html: htmlBody,
          }),
        });

        if (response.ok) {
          console.log(`[Email] Invitation sent to ${recipientEmail} via Resend`);
          return true;
        }
        console.error(`[Email] Resend API error:`, await response.text());
      }

      if (process.env.SENDGRID_API_KEY) {
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: recipientEmail }] }],
            from: { email: process.env.EMAIL_FROM || "noreply@example.com" },
            subject,
            content: [{ type: "text/html", value: htmlBody }],
          }),
        });

        if (response.ok || response.status === 202) {
          console.log(`[Email] Invitation sent to ${recipientEmail} via SendGrid`);
          return true;
        }
        console.error(`[Email] SendGrid API error:`, await response.text());
      }
    } catch (error) {
      console.error(`[Email] Failed to send invitation email:`, error);
    }
  }

  console.log(`[Email] Invitation email for ${recipientEmail}:`);
  console.log(`  Team: ${teamName}`);
  console.log(`  Role: ${roleLabel.en}`);
  console.log(`  Accept URL: ${acceptUrl}`);
  console.log(`  (Configure RESEND_API_KEY or SENDGRID_API_KEY to send actual emails)`);

  return true;
}
