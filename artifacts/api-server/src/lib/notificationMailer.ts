export async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "noreply@example.com",
          to,
          subject,
          html,
        }),
      });

      if (response.ok) {
        console.log(`[Email] Notification sent to ${to} via Resend`);
        return true;
      }
      console.error(`[Email] Resend API error:`, await response.text());
    } catch (error) {
      console.error(`[Email] Failed to send via Resend:`, error);
    }
  }

  if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.EMAIL_FROM || "noreply@example.com" },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      if (response.ok || response.status === 202) {
        console.log(`[Email] Notification sent to ${to} via SendGrid`);
        return true;
      }
      console.error(`[Email] SendGrid API error:`, await response.text());
    } catch (error) {
      console.error(`[Email] Failed to send via SendGrid:`, error);
    }
  }

  console.log(`[Email] Notification email for ${to}:`);
  console.log(`  Subject: ${subject}`);
  console.log(`  (Configure RESEND_API_KEY or SENDGRID_API_KEY to send actual emails)`);
  return true;
}
