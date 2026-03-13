import { db } from "@workspace/db";
import { notificationsTable, notificationPreferencesTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendNotificationEmail } from "./notificationMailer";
import {
  buildCompleteEmail,
  buildErrorEmail,
  teamInviteEmail,
  subscriptionRenewalEmail,
} from "./emailTemplates";

type NotificationType = "build_complete" | "build_error" | "team_invite" | "subscription_renewal";

interface NotificationPrefsMap {
  build_complete: "buildComplete";
  build_error: "buildError";
  team_invite: "teamInvite";
  subscription_renewal: "subscriptionRenewal";
}

const PREF_MAP: NotificationPrefsMap = {
  build_complete: "buildComplete",
  build_error: "buildError",
  team_invite: "teamInvite",
  subscription_renewal: "subscriptionRenewal",
};

async function getUserPreferences(userId: string) {
  const [prefs] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  return prefs;
}

async function getUserEmail(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user?.email || null;
}

async function isNotificationEnabled(userId: string, type: NotificationType): Promise<boolean> {
  const prefs = await getUserPreferences(userId);
  if (!prefs) return true;
  const prefKey = PREF_MAP[type];
  return prefs[prefKey];
}

async function createInAppNotification(params: {
  userId: string;
  type: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  metadata?: string;
}) {
  await db.insert(notificationsTable).values(params);
}

export async function emitBuildComplete(params: {
  userId: string;
  projectName: string;
  projectId: string;
}) {
  const { userId, projectName, projectId } = params;
  const type: NotificationType = "build_complete";

  if (!(await isNotificationEnabled(userId, type))) return;

  await createInAppNotification({
    userId,
    type,
    title: `Build Complete: ${projectName}`,
    titleAr: `اكتمل البناء: ${projectName}`,
    message: `Your project "${projectName}" has been built successfully.`,
    messageAr: `تم بناء مشروعك "${projectName}" بنجاح.`,
    metadata: JSON.stringify({ projectId }),
  });

  const email = await getUserEmail(userId);
  if (email) {
    const template = buildCompleteEmail({ recipientEmail: email, projectName, projectId });
    await sendNotificationEmail(email, template.subject, template.html);
  }
}

export async function emitBuildError(params: {
  userId: string;
  projectName: string;
  projectId: string;
  errorMessage?: string;
}) {
  const { userId, projectName, projectId, errorMessage } = params;
  const type: NotificationType = "build_error";

  if (!(await isNotificationEnabled(userId, type))) return;

  await createInAppNotification({
    userId,
    type,
    title: `Build Failed: ${projectName}`,
    titleAr: `فشل البناء: ${projectName}`,
    message: errorMessage || `An error occurred while building "${projectName}".`,
    messageAr: `حدث خطأ أثناء بناء "${projectName}".`,
    metadata: JSON.stringify({ projectId, errorMessage }),
  });

  const email = await getUserEmail(userId);
  if (email) {
    const template = buildErrorEmail({ recipientEmail: email, projectName, projectId, errorMessage });
    await sendNotificationEmail(email, template.subject, template.html);
  }
}

export async function emitTeamInvite(params: {
  userId: string;
  recipientEmail: string;
  teamName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}) {
  const { userId, recipientEmail, teamName, inviterName, role, acceptUrl } = params;
  const type: NotificationType = "team_invite";

  if (!(await isNotificationEnabled(userId, type))) return;

  await createInAppNotification({
    userId,
    type,
    title: `Team Invitation: ${teamName}`,
    titleAr: `دعوة فريق: ${teamName}`,
    message: `${inviterName} invited you to join "${teamName}" as ${role}.`,
    messageAr: `دعاك ${inviterName} للانضمام إلى "${teamName}" بدور ${role}.`,
    metadata: JSON.stringify({ teamName, inviterName, role }),
  });

  const template = teamInviteEmail({ recipientEmail, teamName, inviterName, role, acceptUrl });
  await sendNotificationEmail(recipientEmail, template.subject, template.html);
}

export async function emitSubscriptionRenewal(params: {
  userId: string;
  planName: string;
  renewalDate: string;
  amount: string;
}) {
  const { userId, planName, renewalDate, amount } = params;
  const type: NotificationType = "subscription_renewal";

  if (!(await isNotificationEnabled(userId, type))) return;

  await createInAppNotification({
    userId,
    type,
    title: `Subscription Renewal: ${planName}`,
    titleAr: `تجديد الاشتراك: ${planName}`,
    message: `Your ${planName} subscription will renew on ${renewalDate} for $${amount}.`,
    messageAr: `سيتم تجديد اشتراكك في خطة ${planName} بتاريخ ${renewalDate} بمبلغ $${amount}.`,
    metadata: JSON.stringify({ planName, renewalDate, amount }),
  });

  const email = await getUserEmail(userId);
  if (email) {
    const template = subscriptionRenewalEmail({ recipientEmail: email, planName, renewalDate, amount });
    await sendNotificationEmail(email, template.subject, template.html);
  }
}
