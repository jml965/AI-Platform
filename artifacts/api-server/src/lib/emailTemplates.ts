function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface BuildCompleteEmailParams {
  recipientEmail: string;
  projectName: string;
  projectId: string;
}

export interface BuildErrorEmailParams {
  recipientEmail: string;
  projectName: string;
  projectId: string;
  errorMessage?: string;
}

export interface TeamInviteEmailParams {
  recipientEmail: string;
  teamName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}

export interface SubscriptionRenewalEmailParams {
  recipientEmail: string;
  planName: string;
  renewalDate: string;
  amount: string;
}

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html dir="ltr">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
  <div style="background: #0a0a0f; color: #ffffff; padding: 40px; border-radius: 16px;">
    ${content}
    <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
    <p style="color: #555; font-size: 11px;">
      You can manage your email notification preferences in your account settings.<br/>
      يمكنك إدارة تفضيلات إشعارات البريد الإلكتروني من إعدادات حسابك.
    </p>
  </div>
</body>
</html>`;
}

export function buildCompleteEmail(params: BuildCompleteEmailParams) {
  const name = escapeHtml(params.projectName);
  return {
    subject: `Build Complete: "${params.projectName}" | اكتمل البناء: "${params.projectName}"`,
    html: wrapHtml(`
    <h1 style="color: #34d399; margin: 0 0 8px;">✅ Build Complete</h1>
    <p style="color: #999; margin: 0 0 24px;">اكتمل البناء</p>
    <p style="color: #e0e0e0; line-height: 1.6;">
      Your project <strong>"${name}"</strong> has been built successfully and is ready to preview.
    </p>
    <p style="color: #999; line-height: 1.6; direction: rtl; text-align: right;">
      تم بناء مشروعك <strong>"${name}"</strong> بنجاح وهو جاهز للمعاينة.
    </p>`),
  };
}

export function buildErrorEmail(params: BuildErrorEmailParams) {
  const name = escapeHtml(params.projectName);
  const errorMsg = params.errorMessage ? escapeHtml(params.errorMessage) : "";
  const errorDetail = errorMsg ? `<p style="color: #f87171; font-size: 13px; background: #1a0a0a; padding: 12px; border-radius: 8px; margin-top: 16px;">${errorMsg}</p>` : "";
  return {
    subject: `Build Failed: "${params.projectName}" | فشل البناء: "${params.projectName}"`,
    html: wrapHtml(`
    <h1 style="color: #f87171; margin: 0 0 8px;">❌ Build Failed</h1>
    <p style="color: #999; margin: 0 0 24px;">فشل البناء</p>
    <p style="color: #e0e0e0; line-height: 1.6;">
      An error occurred while building your project <strong>"${name}"</strong>. Please check the build logs for details.
    </p>
    <p style="color: #999; line-height: 1.6; direction: rtl; text-align: right;">
      حدث خطأ أثناء بناء مشروعك <strong>"${name}"</strong>. يرجى التحقق من سجلات البناء للتفاصيل.
    </p>
    ${errorDetail}`),
  };
}

export function teamInviteEmail(params: TeamInviteEmailParams) {
  const team = escapeHtml(params.teamName);
  const inviter = escapeHtml(params.inviterName);
  const safeUrl = escapeHtml(params.acceptUrl);
  const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
    admin: { en: "Admin", ar: "مدير" },
    developer: { en: "Developer", ar: "مطور" },
    reviewer: { en: "Reviewer", ar: "مراجع" },
    viewer: { en: "Viewer", ar: "مشاهد" },
  };
  const roleLabel = ROLE_LABELS[params.role] || { en: escapeHtml(params.role), ar: escapeHtml(params.role) };
  return {
    subject: `Team Invitation: "${params.teamName}" | دعوة فريق: "${params.teamName}"`,
    html: wrapHtml(`
    <h1 style="color: #a78bfa; margin: 0 0 8px;">Team Invitation</h1>
    <p style="color: #999; margin: 0 0 24px;">دعوة فريق</p>
    <p style="color: #e0e0e0; line-height: 1.6;">
      <strong>${inviter}</strong> has invited you to join the team <strong>"${team}"</strong> as a <strong>${roleLabel.en}</strong>.
    </p>
    <p style="color: #999; line-height: 1.6; direction: rtl; text-align: right;">
      دعاك <strong>${inviter}</strong> للانضمام إلى فريق <strong>"${team}"</strong> بدور <strong>${roleLabel.ar}</strong>.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${safeUrl}" style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
        Accept Invitation / قبول الدعوة
      </a>
    </div>
    <p style="color: #666; font-size: 12px; margin-top: 24px;">
      This invitation expires in 7 days. | تنتهي صلاحية هذه الدعوة خلال 7 أيام.
    </p>`),
  };
}

export function subscriptionRenewalEmail(params: SubscriptionRenewalEmailParams) {
  const plan = escapeHtml(params.planName);
  const date = escapeHtml(params.renewalDate);
  const amt = escapeHtml(params.amount);
  return {
    subject: `Subscription Renewal Reminder | تذكير بتجديد الاشتراك`,
    html: wrapHtml(`
    <h1 style="color: #fbbf24; margin: 0 0 8px;">⏰ Subscription Renewal</h1>
    <p style="color: #999; margin: 0 0 24px;">تجديد الاشتراك</p>
    <p style="color: #e0e0e0; line-height: 1.6;">
      Your <strong>${plan}</strong> subscription will renew on <strong>${date}</strong> for <strong>$${amt}</strong>.
    </p>
    <p style="color: #999; line-height: 1.6; direction: rtl; text-align: right;">
      سيتم تجديد اشتراكك في خطة <strong>${plan}</strong> بتاريخ <strong>${date}</strong> بمبلغ <strong>$${amt}</strong>.
    </p>`),
  };
}
