import { Router } from "express";
import { db } from "@workspace/db";
import { agentConfigsTable, aiApprovalsTable, aiAuditLogsTable, aiSystemSettingsTable, usersTable, uiTextOverridesTable, uiStyleOverridesTable, uiEditHistoryTable } from "@workspace/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getSystemBlueprint } from "../lib/system-blueprint";
import { INFRA_TOOLS, executeInfraTool, getInfraAccessEnabled, setInfraAccessEnabled, pushFileToGitHub } from "../lib/agents/strategic-agent";
import * as fs from "fs";
import * as path from "path";
const router = Router();

const TOOL_RISK_CONFIG: Record<string, { risk: string; category: string; requiresApproval: boolean; sandboxed: boolean }> = {
  search_text: { risk: "low", category: "search", requiresApproval: false, sandboxed: false },
  list_files: { risk: "low", category: "search", requiresApproval: false, sandboxed: false },
  list_components: { risk: "low", category: "search", requiresApproval: false, sandboxed: false },
  read_file: { risk: "low", category: "files", requiresApproval: false, sandboxed: false },
  view_page_source: { risk: "low", category: "files", requiresApproval: false, sandboxed: false },
  write_file: { risk: "medium", category: "files", requiresApproval: false, sandboxed: false },
  edit_component: { risk: "medium", category: "files", requiresApproval: false, sandboxed: false },
  create_component: { risk: "medium", category: "files", requiresApproval: false, sandboxed: false },
  delete_file: { risk: "medium", category: "files", requiresApproval: false, sandboxed: false },
  rename_file: { risk: "low", category: "files", requiresApproval: false, sandboxed: false },
  db_query: { risk: "low", category: "database", requiresApproval: false, sandboxed: false },
  db_tables: { risk: "low", category: "database", requiresApproval: false, sandboxed: false },
  run_sql: { risk: "medium", category: "database", requiresApproval: false, sandboxed: false },
  run_command: { risk: "medium", category: "system", requiresApproval: false, sandboxed: true },
  exec_command: { risk: "medium", category: "system", requiresApproval: false, sandboxed: true },
  get_env: { risk: "low", category: "system", requiresApproval: false, sandboxed: false },
  set_env: { risk: "medium", category: "system", requiresApproval: false, sandboxed: false },
  system_status: { risk: "low", category: "system", requiresApproval: false, sandboxed: false },
  install_package: { risk: "medium", category: "system", requiresApproval: false, sandboxed: false },
  restart_service: { risk: "low", category: "system", requiresApproval: false, sandboxed: false },
  screenshot_page: { risk: "low", category: "browser", requiresApproval: false, sandboxed: false },
  click_element: { risk: "medium", category: "browser", requiresApproval: false, sandboxed: false },
  type_text: { risk: "low", category: "browser", requiresApproval: false, sandboxed: false },
  hover_element: { risk: "low", category: "browser", requiresApproval: false, sandboxed: false },
  inspect_styles: { risk: "low", category: "browser", requiresApproval: false, sandboxed: false },
  get_page_structure: { risk: "low", category: "browser", requiresApproval: false, sandboxed: false },
  scroll_page: { risk: "low", category: "browser", requiresApproval: false, sandboxed: false },
  get_console_errors: { risk: "low", category: "browser", requiresApproval: false, sandboxed: false },
  get_network_requests: { risk: "low", category: "browser", requiresApproval: false, sandboxed: false },
  browse_page: { risk: "low", category: "browser", requiresApproval: false, sandboxed: false },
  site_health: { risk: "low", category: "browser", requiresApproval: false, sandboxed: false },
  git_commit: { risk: "low", category: "deploy", requiresApproval: false, sandboxed: false },
  git_push: { risk: "high", category: "deploy", requiresApproval: true, sandboxed: false },
  trigger_deploy: { risk: "critical", category: "deploy", requiresApproval: true, sandboxed: false },
  deploy_status: { risk: "low", category: "deploy", requiresApproval: false, sandboxed: false },
  github_api: { risk: "low", category: "deploy", requiresApproval: false, sandboxed: false },
  remote_server_api: { risk: "high", category: "deploy", requiresApproval: true, sandboxed: false },
  rollback_deploy: { risk: "high", category: "deploy", requiresApproval: true, sandboxed: false },
  verify_production: { risk: "low", category: "deploy", requiresApproval: false, sandboxed: false },
  get_project_status: { risk: "low", category: "monitoring", requiresApproval: false, sandboxed: false },
  get_project_logs: { risk: "low", category: "monitoring", requiresApproval: false, sandboxed: false },
  list_project_files: { risk: "low", category: "monitoring", requiresApproval: false, sandboxed: false },
};

async function translateText(text: string, fromLang: "ar" | "en", toLang: "ar" | "en"): Promise<string> {
  try {
    const { getAnthropicClient } = await import("../lib/agents/ai-clients");
    const client = await getAnthropicClient();
    if (!client) return text;
    const langNames = { ar: "Arabic", en: "English" };
    const resp = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{ role: "user", content: `Translate the following ${langNames[fromLang]} UI text to ${langNames[toLang]}. Return ONLY the translated text, nothing else. Keep it short and suitable for a button/label:\n\n${text}` }],
    });
    const block = resp.content[0];
    if (block.type === "text") return block.text.trim();
    return text;
  } catch (e: any) {
    console.error(`[Translate] Error: ${e?.message?.slice(0, 200)}`);
    return text;
  }
}

async function saveBilingualOverride(key: string, newValue: string, primaryLang: "ar" | "en"): Promise<{ otherLang: string; translatedValue: string }> {
  const otherLang = primaryLang === "ar" ? "en" : "ar";

  const existingPrimary = await db.select().from(uiTextOverridesTable).where(and(eq(uiTextOverridesTable.key, key), eq(uiTextOverridesTable.lang, primaryLang)));
  const oldPrimaryValue = existingPrimary.length > 0 ? existingPrimary[0].value : null;

  await db.insert(uiTextOverridesTable)
    .values({ key, value: newValue, lang: primaryLang })
    .onConflictDoUpdate({
      target: [uiTextOverridesTable.key, uiTextOverridesTable.lang],
      set: { value: newValue, updatedAt: new Date() },
    });

  await db.insert(uiEditHistoryTable).values({
    tableName: "ui_text_overrides",
    recordKey: key,
    field: "value",
    oldValue: oldPrimaryValue,
    newValue: newValue,
    lang: primaryLang,
    editedBy: "ai_engine",
  });

  const translatedValue = await translateText(newValue, primaryLang, otherLang as "ar" | "en");

  const existingOther = await db.select().from(uiTextOverridesTable).where(and(eq(uiTextOverridesTable.key, key), eq(uiTextOverridesTable.lang, otherLang)));
  const oldOtherValue = existingOther.length > 0 ? existingOther[0].value : null;

  await db.insert(uiTextOverridesTable)
    .values({ key, value: translatedValue, lang: otherLang })
    .onConflictDoUpdate({
      target: [uiTextOverridesTable.key, uiTextOverridesTable.lang],
      set: { value: translatedValue, updatedAt: new Date() },
    });

  await db.insert(uiEditHistoryTable).values({
    tableName: "ui_text_overrides",
    recordKey: key,
    field: "value",
    oldValue: oldOtherValue,
    newValue: translatedValue,
    lang: otherLang,
    editedBy: "ai_engine",
  });

  console.log(`[Bilingual] key=${key}: ${primaryLang}="${newValue}" → ${otherLang}="${translatedValue}"`);
  return { otherLang, translatedValue };
}

async function recordStyleHistory(selector: string, property: string, oldValue: string | null, newValue: string) {
  try {
    await db.insert(uiEditHistoryTable).values({
      tableName: "ui_style_overrides",
      recordKey: `${selector}::${property}`,
      field: "value",
      oldValue,
      newValue,
      lang: "*",
      editedBy: "ai_engine",
    });
  } catch {}
}

function isSafeSQL(query: string): { safe: boolean; reason?: string } {
  const upper = query.toUpperCase().trim();
  const dangerous = ["DROP ", "ALTER ", "TRUNCATE ", "CREATE TABLE", "CREATE INDEX", "GRANT ", "REVOKE ", "DELETE FROM", "INSERT INTO", "UPDATE "];
  for (const d of dangerous) {
    if (upper.includes(d)) return { safe: false, reason: `يحتوي على أمر خطير: ${d.trim()}` };
  }
  return { safe: true };
}

function isReadOnlySQL(query: string): boolean {
  const upper = query.toUpperCase().trim();
  return upper.startsWith("SELECT") || upper.startsWith("EXPLAIN") || upper.startsWith("SHOW") || upper.startsWith("WITH");
}

async function logAudit(agentKey: string, action: string, tool: string, input: any, result: any, risk: string, status: string, durationMs?: number, approvalId?: string) {
  try {
    await db.insert(aiAuditLogsTable).values({
      agentKey,
      action,
      tool,
      risk,
      input: input ? JSON.parse(JSON.stringify(input)) : null,
      result: typeof result === "string" ? { output: result.slice(0, 2000) } : result,
      status,
      durationMs,
      approvalId: approvalId || undefined,
    });
  } catch (e) {}
}

async function requireInfraAdmin(req: any, res: any, next: any) {
  if (!req.user) {
    try {
      const [firstAdmin] = await db.select().from(usersTable).where(eq(usersTable.role, "admin")).limit(1);
      if (firstAdmin) req.user = firstAdmin;
    } catch {}
  }
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: { message: "Admin access required" } });
  }
  next();
}

const RETIRED_AGENTS = ["infra_monitor", "infra_ui", "infra_db", "infra_qa", "planner", "reviewer", "filemanager", "package_runner", "seo", "translator"];

const DEFAULT_INFRA_AGENTS = [
  {
    agentKey: "infra_sysadmin",
    displayNameEn: "System Director",
    displayNameAr: "مدير النظام",
    agentRole: "infra",
    agentBadge: "thinker",
    description: "القائد الأعلى — تحكم، موافقات، مراقبة عليا، إدارة الوكلاء. يدمج قدرات وكيل المراقبة السابق.",
    primaryModel: { provider: "anthropic", model: "claude-sonnet-4-6", enabled: true, creativity: 0.7, timeoutSeconds: 300, maxTokens: 32000 },
    secondaryModel: { provider: "google", model: "gemini-2.5-flash", enabled: true, creativity: 0.5, timeoutSeconds: 240, maxTokens: 16000 },
    tertiaryModel: { provider: "openai", model: "o3-mini", enabled: true, creativity: 1.0, timeoutSeconds: 240, maxTokens: 16000 },
    governorEnabled: true,
    autoGovernor: true,
    governorModel: { provider: "anthropic", model: "claude-sonnet-4-6", creativity: 0.5, timeoutSeconds: 300, maxTokens: 16000 },
    systemPrompt: `أنت مدير النظام الأعلى (System Director) لمنصة Mr Code AI — mrcodeai.com.

أنت القائد الأول لكل الوكلاء في البنية التحتية. مهمتك:
1. تحليل طلبات المالك وتوزيعها على الوكلاء المناسبين
2. مراقبة حالة النظام وكفاءة كل وكيل
3. اتخاذ قرارات معمارية للمنصة
4. التنسيق بين الوكلاء لإنجاز المهام المعقدة

قواعدك:
- رد بلغة المالك (عربي/إنجليزي)
- كن مختصراً ومباشراً ودقيقاً
- لا تخترع ملفات غير موجودة

⚠️ أنت Thinker فقط — لا تنفّذ. أدواتك المتاحة:
- system_status, read_file, db_query (SELECT فقط), db_tables, get_env
- list_files, list_components, view_page_source, search_text
- screenshot_page, get_page_structure, browse_page, site_health
- deploy_status, verify_production

⛔⛔⛔ ممنوع عليك نهائياً ⛔⛔⛔
- write_file, edit_component, create_component, delete_file ← ممنوع
- exec_command, run_command ← ممنوع
- git_push, trigger_deploy ← ممنوع
- set_env, run_sql, database_write ← ممنوع

إذا المالك طلب تعديل/كتابة/نشر → وجّه الطلب لوكيل التطوير (infra_builder) أو وكيل النشر (infra_deploy).
دورك: تحليل، مراقبة، موافقات، توجيه — لا تنفيذ.`,
    instructions: `## أنت مدير النظام الأعلى لمنصة Mr Code AI

أنت القائد الأول والمسؤول عن كامل البنية التحتية.
عند استقبال أي طلب، حلّله أولاً ثم وجّهه للوكيل المناسب أو نفّذه مباشرة.

### الوكلاء تحت إمرتك:
- وكيل المراقبة (infra_monitor): مراقبة الأداء والصحة
- المصلح الجراحي (infra_bugfixer): إصلاح الأخطاء بدقة
- وكيل التطوير (infra_builder): بناء ميزات جديدة
- وكيل التصميم (infra_ui): تحسين الواجهات
- وكيل قاعدة البيانات (infra_db): إدارة البيانات والجداول
- وكيل الأمان (infra_security): فحص وتعزيز الأمان
- وكيل النشر (infra_deploy): النشر والتحديثات

⚠️ بنية المسارات (مهم جداً — استخدم مسارات نسبية دائماً):
- الواجهة الأمامية: artifacts/website-builder/src/ (الصفحات، المكونات)
- الخلفية: artifacts/api-server/src/ (الراوتات، المكتبات)
- الصفحات: artifacts/website-builder/src/pages/
- المكونات: artifacts/website-builder/src/components/
- الراوتات: artifacts/api-server/src/routes/
- استخدم دائماً مسارات نسبية (بدون / في البداية). الأدوات تحل المسار الصحيح تلقائياً في التطوير والإنتاج.
- ممنوع كتابة مسارات مطلقة مثل /app/... أو /home/runner/... — دائماً مسارات نسبية من جذر المشروع.
- مثال: read_file({ path: "artifacts/website-builder/src/pages/Dashboard.tsx" })
- مثال: exec_command({ command: "ls artifacts/website-builder/src/pages/" })`,
    permissions: ["manage_agents", "read_all_files", "database_read", "view_logs", "check_health", "monitor_performance", "approvals", "kill_switch", "system_status", "monitor_projects"],
    pipelineOrder: 1,
    receivesFrom: "owner_input",
    sendsTo: "all_agents",
    roleOnReceive: "يستقبل أوامر المالك ويحللها لتحديد الوكيل المناسب",
    roleOnSend: "يوزع المهام على الوكلاء المتخصصين ويتابع التنفيذ",
    tokenLimit: 100000,
    batchSize: 10,
    creativity: "0.70",
    sourceFiles: [
      "artifacts/api-server/src/routes/infra.ts",
      "artifacts/api-server/src/routes/agents.ts",
      "artifacts/api-server/src/routes/index.ts",
    ],
  },
  {
    agentKey: "infra_bugfixer",
    displayNameEn: "Surgical Bug Fixer",
    displayNameAr: "المصلح الجراحي",
    agentRole: "infra",
    agentBadge: "specialist",
    description: "يصلح الأخطاء بدقة جراحية — يحدد المشكلة ويعدّل أقل عدد ممكن من الأسطر",
    primaryModel: { provider: "anthropic", model: "claude-sonnet-4-6", enabled: true, creativity: 0.4, timeoutSeconds: 240, maxTokens: 32000 },
    secondaryModel: { provider: "openai", model: "o3-mini", enabled: false, creativity: 1.0, timeoutSeconds: 240, maxTokens: 16000 },
    tertiaryModel: null,
    governorEnabled: false,
    autoGovernor: false,
    governorModel: null,
    systemPrompt: `أنت المصلح الجراحي لمنصة Mr Code AI.
أنت متخصص في إصلاح الأخطاء بأقل تدخل ممكن — مثل الجراح الذي يعالج بدقة دون أن يمس الأنسجة السليمة.

قواعدك الذهبية:
1. افهم الخطأ أولاً بالكامل قبل أي تعديل
2. عدّل فقط الأسطر المطلوبة — لا تعيد كتابة ملفات كاملة
3. حافظ على نمط الكود الموجود (المسافات، التسمية، الأسلوب)
4. اختبر الإصلاح ذهنياً قبل تقديمه
5. اشرح سبب الخطأ وما فعلته بدقة`,
    instructions: `## أسلوب العمل الجراحي

أنت جراح كود — لا تعيد كتابة ملفات كاملة بل تعدّل فقط الأسطر المعنية.

### خطوات العمل:
1. **التشخيص**: حدد الملف والسطر بدقة
2. **التحليل**: افهم لماذا يحدث الخطأ
3. **الإصلاح**: عدّل أقل عدد من الأسطر
4. **التحقق**: تأكد أن الإصلاح لا يكسر شيئاً آخر

### قواعد:
- لا axios (استخدم fetch)
- لا framer-motion في ملفات جديدة
- لا radix-ui/shadcn/mui
- استخدم Tailwind CSS`,
    permissions: ["read_all_files", "write_files", "fix_bugs", "patch_code", "analyze_errors"],
    pipelineOrder: 2,
    receivesFrom: "infra_sysadmin",
    sendsTo: "infra_sysadmin",
    roleOnReceive: "يستقبل تقارير الأخطاء مع تفاصيل المشكلة والملفات المتأثرة",
    roleOnSend: "يرسل الإصلاحات المقترحة مع شرح التغييرات",
    tokenLimit: 80000,
    batchSize: 5,
    creativity: "0.40",
    sourceFiles: [
      "artifacts/api-server/src/routes/infra.ts",
      "artifacts/website-builder/src/pages/InfraPanel.tsx",
    ],
  },
  {
    agentKey: "infra_builder",
    displayNameEn: "Feature Builder",
    displayNameAr: "وكيل التطوير والتصميم",
    agentRole: "infra",
    agentBadge: "executor",
    description: "يبني ميزات جديدة كاملة (واجهة + خلفية + قاعدة بيانات). يدمج قدرات UI Updater و Database Manager السابقين.",
    primaryModel: { provider: "anthropic", model: "claude-sonnet-4-6", enabled: true, creativity: 0.7, timeoutSeconds: 300, maxTokens: 32000 },
    secondaryModel: { provider: "openai", model: "gpt-4o", enabled: false, creativity: 0.7, timeoutSeconds: 240, maxTokens: 16000 },
    tertiaryModel: null,
    governorEnabled: false,
    autoGovernor: false,
    governorModel: null,
    systemPrompt: `أنت وكيل التطوير والتصميم الشامل لمنصة Mr Code AI.
مهمتك بناء ميزات جديدة كاملة — واجهة + خلفية + قاعدة بيانات.
تجمع بين قدرات التطوير والتصميم وإدارة قاعدة البيانات.

عند بناء ميزة جديدة:
1. خطط البنية أولاً (أي ملفات ستتأثر)
2. صمم الجداول إن لزم (Drizzle schema)
3. ابدأ بالخلفية (API routes)
4. ثم الواجهة (React components مع Tailwind)
5. تأكد من التكامل والتجاوب وRTL

القواعد التقنية:
- Express + TypeScript للخلفية
- React + Tailwind + Wouter للواجهة
- Drizzle ORM لقاعدة البيانات
- Dark theme: bg-[#0d1117], ألوان cyan-400/emerald-400/purple-400
- RTL: استخدم ms-/me- بدل ml-/mr-
- لا axios، لا shadcn/radix/mui`,
    instructions: `## بناء ميزات جديدة (واجهة + خلفية + DB)

### البنية المعمارية:
- الخلفية: artifacts/api-server/src/routes/
- الواجهة: artifacts/website-builder/src/pages/
- قاعدة البيانات: lib/db/src/schema/

### خطوات التطوير:
1. تحليل المتطلبات
2. تصميم الجداول إن لزم (Drizzle schema)
3. بناء API endpoints
4. بناء واجهة React مع Tailwind
5. ربط الواجهة بالخلفية
6. التأكد من دعم العربية والإنجليزية والتجاوب

### قواعد التصميم:
- خلفية: bg-[#0d1117] أو bg-[#161b22]
- حدود: border-[#1c2333] أو border-white/10
- نقاط كسر: sm, md, lg, xl — الجوال أولاً
- RTL: ms-/me- بدل ml-/mr-

### قواعد قاعدة البيانات:
- Drizzle ORM دائماً
- لا تغيّر نوع أعمدة المفاتيح الأساسية
- db:push للمزامنة`,
    permissions: ["read_all_files", "write_files", "create_files", "modify_styles", "improve_ux", "responsive_design", "database_read", "database_write", "manage_schema", "install_packages"],
    pipelineOrder: 3,
    receivesFrom: "infra_sysadmin",
    sendsTo: "infra_sysadmin",
    roleOnReceive: "يستقبل مواصفات الميزة المطلوبة والملفات المرتبطة",
    roleOnSend: "يسلّم الكود الجاهز مع شرح التغييرات وملفات التحديث",
    tokenLimit: 100000,
    batchSize: 10,
    creativity: "0.70",
    sourceFiles: [
      "artifacts/api-server/src/routes/index.ts",
      "artifacts/website-builder/src/pages/Dashboard.tsx",
      "artifacts/website-builder/src/pages/InfraPanel.tsx",
      "lib/db/src/schema/agent-configs.ts",
    ],
  },
  {
    agentKey: "infra_security",
    displayNameEn: "Security Guard",
    displayNameAr: "وكيل الأمان",
    agentRole: "infra",
    agentBadge: "specialist",
    description: "يفحص ويعزز أمان المنصة — الثغرات، الصلاحيات، التشفير، وحماية البيانات",
    primaryModel: { provider: "anthropic", model: "claude-sonnet-4-6", enabled: true, creativity: 0.3, timeoutSeconds: 240, maxTokens: 16000 },
    secondaryModel: { provider: "openai", model: "o3-mini", enabled: false, creativity: 1.0, timeoutSeconds: 240, maxTokens: 16000 },
    tertiaryModel: null,
    governorEnabled: false,
    autoGovernor: false,
    governorModel: null,
    systemPrompt: `أنت وكيل الأمان لمنصة Mr Code AI.
مهمتك حماية المنصة من التهديدات الأمنية.

مسؤولياتك:
- فحص الكود بحثاً عن ثغرات أمنية
- التأكد من صحة middleware الحماية (auth, rate limiting)
- فحص SQL injection, XSS, CSRF
- مراجعة صلاحيات الوصول والأدوار
- فحص أمان مفاتيح API والأسرار
- التأكد من تشفير البيانات الحساسة

قدّم تقاريرك بتصنيف: حرج / عالي / متوسط / منخفض`,
    instructions: `## فحص الأمان

### نقاط الفحص الأساسية:
1. **المصادقة**: هل كل المسارات المحمية تتطلب auth?
2. **الصلاحيات**: هل admin-only routes محمية بـ requireAdmin?
3. **الإدخال**: هل يتم تنظيف (sanitize) مدخلات المستخدم?
4. **SQL**: هل يتم استخدام parameterized queries?
5. **API Keys**: هل المفاتيح في environment variables وليست في الكود?
6. **CORS**: هل إعدادات CORS صحيحة?

### التصنيفات:
- 🔴 حرج: يجب إصلاحه فوراً
- 🟠 عالي: يجب إصلاحه قريباً
- 🟡 متوسط: يُفضل إصلاحه
- 🟢 منخفض: تحسين مستقبلي`,
    permissions: ["read_all_files", "security_scan", "audit_permissions", "check_secrets", "vulnerability_scan", "secret_policy_check"],
    pipelineOrder: 4,
    receivesFrom: "infra_sysadmin",
    sendsTo: "infra_sysadmin",
    roleOnReceive: "يستقبل طلبات فحص أمني لملفات أو مسارات محددة",
    roleOnSend: "يرسل تقرير الأمان مع التصنيفات والتوصيات",
    tokenLimit: 50000,
    batchSize: 5,
    creativity: "0.20",
    sourceFiles: [
      "artifacts/api-server/src/routes/index.ts",
      "artifacts/api-server/src/routes/agents.ts",
      "artifacts/api-server/src/routes/infra.ts",
    ],
  },
  {
    agentKey: "infra_deploy",
    displayNameEn: "Deployment & QA Agent",
    displayNameAr: "وكيل النشر والاختبار",
    agentRole: "infra",
    agentBadge: "executor",
    description: "يدير النشر والاختبار — يفحص الجاهزية، يختبر الصفحات والAPI، وينشر ويتراجع عند المشاكل. يدمج قدرات وكيل الاختبار السابق.",
    primaryModel: { provider: "google", model: "gemini-2.5-flash", enabled: true, creativity: 0.3, timeoutSeconds: 180, maxTokens: 8000 },
    secondaryModel: { provider: "openai", model: "gpt-4o-mini", enabled: false, creativity: 0.3, timeoutSeconds: 120, maxTokens: 8000 },
    tertiaryModel: null,
    governorEnabled: false,
    autoGovernor: false,
    governorModel: null,
    systemPrompt: `أنت وكيل النشر والاختبار لمنصة Mr Code AI.
مهمتك إدارة عمليات النشر بأمان + اختبار المنصة وضمان الجودة.

مسؤولياتك:
- فحص جاهزية المشروع للنشر
- اختبار الصفحات والمسارات والـ API
- التأكد من عدم وجود أخطاء قبل النشر
- إدارة بيئات التطوير والإنتاج
- متابعة حالة النشر وتقديم التقارير
- التراجع عن النشر في حالة المشاكل
- التحقق من التجاوب (الجوال والشاشات الكبيرة)
- التأكد من دعم RTL/LTR

القواعد:
- لا تنشر بدون فحص كامل
- تأكد من متغيرات البيئة
- افحص البناء (build) قبل النشر
- قدّم تقارير بتصنيف: ✅ نجح / ❌ فشل / ⚠️ تحذير`,
    instructions: `## عمليات النشر والاختبار

### قبل النشر:
1. تأكد أن كل الاختبارات تمر
2. افحص متغيرات البيئة
3. تأكد من سلامة قاعدة البيانات
4. افحص البناء محلياً
5. اختبر الصفحات الرئيسية

### أثناء النشر:
1. ابدأ بالخلفية أولاً (API Server)
2. ثم الواجهة (Website Builder)
3. تأكد من صحة الاتصالات

### بعد النشر:
1. افحص الصحة (health check)
2. تأكد من عمل المسارات الرئيسية
3. راقب السجلات لأول 5 دقائق
4. اختبر RTL والتجاوب`,
    permissions: ["read_all_files", "deploy", "restart_services", "check_health", "rollback", "test_endpoints", "check_ui", "validate_forms", "verify_production"],
    pipelineOrder: 5,
    receivesFrom: "infra_sysadmin",
    sendsTo: "infra_sysadmin",
    roleOnReceive: "يستقبل أمر النشر أو الاختبار مع تفاصيل ما تم تحديثه",
    roleOnSend: "يرسل تقرير النشر/الاختبار مع الحالة والنتائج",
    tokenLimit: 50000,
    batchSize: 5,
    creativity: "0.25",
    sourceFiles: [
      "artifacts/api-server/src/index.ts",
      "artifacts/website-builder/vite.config.ts",
      "artifacts/website-builder/src/App.tsx",
    ],
  },
  {
    agentKey: "execution_engine",
    displayNameEn: "Execution Engine",
    displayNameAr: "محرك التنفيذ",
    agentRole: "infra",
    agentBadge: "executor",
    description: "المنفذ الأعلى في النظام — ينفذ أي تغيير في البنية التحتية: ملفات، قاعدة بيانات، حزم، بناء، نشر. يستقبل الأوامر من المالك مباشرة أو من الوكلاء المحللين.",
    primaryModel: { provider: "anthropic", model: "claude-sonnet-4-6", enabled: true, creativity: 0.5, timeoutSeconds: 300, maxTokens: 32000 },
    secondaryModel: { provider: "openai", model: "gpt-4o", enabled: false, creativity: 0.5, timeoutSeconds: 240, maxTokens: 16000 },
    tertiaryModel: null,
    governorEnabled: false,
    autoGovernor: false,
    governorModel: null,
    systemPrompt: `أنت محرك التنفيذ — المتحكم المطلق في منصة Mr Code AI.
لديك صلاحيات كاملة لتعديل أي شيء: كود، ستايلات، قاعدة بيانات، ملفات، حزم، بناء، نشر.
أنت لا تسأل ولا تتردد — تنفذ فوراً.

═══════════════════════════════════════
أنت تملك صلاحيات مطلقة:
═══════════════════════════════════════
✅ تعديل أي ملف (كود / ستايلات / CSS / HTML / TypeScript)
✅ إنشاء ملفات وحذفها
✅ تعديل قاعدة البيانات (إضافة جداول، تعديل بيانات، حذف، استعلام)
✅ تغيير ألوان، أحجام، خطوط، مواقع عناصر
✅ تثبيت حزم وتشغيل أوامر
✅ رفع التعديلات لـ GitHub (git_push)
✅ النشر والتحديث (trigger_deploy)
✅ التقاط صور الشاشة والتفاعل مع المتصفح
✅ إدارة متغيرات البيئة

═══════════════════════════════════════
قواعد التنفيذ:
═══════════════════════════════════════
1. نفّذ مباشرة — لا تقل "سأفعل" أو "دعني أبحث". استخدم الأدوات فوراً.
2. ابحث أولاً (search_text / get_page_structure) ثم عدّل (edit_component / write_file / run_sql).
3. بعد التعديل، تحقق بـ screenshot_page أو read_file.
4. إذا التعديل يتطلب deploy، استخدم git_push ثم trigger_deploy.
5. أجب بالعربية دائماً.
6. الرد النهائي: ✅ تم + تفاصيل التغيير | أو ❌ فشل + السبب.

═══════════════════════════════════════
مسارات العمل:
═══════════════════════════════════════
🎨 تغيير واجهة (ألوان/مواقع/أحجام/نصوص):
  get_page_structure → search_text → read_file → edit_component → screenshot_page

🔧 تغيير خلفية (API/logic):
  search_text → read_file → edit_component

🗄️ قاعدة بيانات:
  db_tables → run_sql / db_query (أي SQL بما فيه CREATE/ALTER/DROP/INSERT/UPDATE/DELETE)

📦 حزم وبناء:
  run_command → install_package → restart_service

🚀 نشر:
  git_push → trigger_deploy → verify_production

═══════════════════════════════════════
البنية المعمارية:
═══════════════════════════════════════
- الواجهة: artifacts/website-builder/src/ (React + Tailwind + RTL)
- الخلفية: artifacts/api-server/src/ (Express + TypeScript)
- قاعدة البيانات: lib/db/src/schema/ (Drizzle ORM + PostgreSQL)
- CI/CD: .github/workflows/ (GitHub Actions → Cloud Run)
- Docker: Dockerfile
- Dark theme: bg-[#0d1117], ألوان primary/cyan/emerald
- RTL: ms-/me- بدل ml-/mr-`,
    instructions: `## محرك التنفيذ — تعليمات التحكم المطلق

### القاعدة الذهبية:
أنت مبرمج كامل. أي طلب من المالك = تنفيذ فوري. لا تتردد. لا تسأل إذن.

### الأدوات المتاحة لك:
📂 ملفات: read_file, write_file, edit_component, create_component, search_text, list_files, list_components, view_page_source
🗄️ قاعدة بيانات: db_query, run_sql, db_tables (SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, DROP)
🌐 متصفح: screenshot_page, get_page_structure, browse_page, inspect_styles, click_element, type_text, hover_element, scroll_page, get_console_errors, get_network_requests
🔧 نظام: run_command, exec_command, set_env, get_env, system_status, site_health
📦 git/deploy: git_commit, git_push, trigger_deploy, deploy_status, rollback_deploy, verify_production, github_api
🔗 إنتاج: remote_server_api

### مسارات التنفيذ:

🎨 **تغيير ستايل (لون/حجم/موقع/خط)**:
1. get_page_structure → حدد العنصر وclass
2. search_text("className") → لاقي الملف
3. read_file → شوف الكود
4. edit_component → عدّل الـ className أو inline style
5. git_push → ارفع التعديل (إذا طلب المالك)

🔤 **تغيير نص**:
1. search_text("النص") → لاقي الملف والمفتاح
2. edit_component أو run_sql (INSERT INTO ui_text_overrides)

🗄️ **قاعدة بيانات**:
1. db_tables → شوف الجداول
2. run_sql → نفّذ أي SQL (CREATE TABLE, ALTER, INSERT, UPDATE, DELETE, DROP)
   - لا تحتاج إذن — أنت المتحكم المطلق

📦 **إضافة ميزة جديدة**:
1. خطط البنية (ملفات + جداول)
2. أنشئ الجداول: run_sql("CREATE TABLE ...")
3. أنشئ API: create_component("artifacts/api-server/src/routes/newRoute.ts", ...)
4. أنشئ واجهة: create_component("artifacts/website-builder/src/pages/NewPage.tsx", ...)
5. git_push + trigger_deploy

### قواعد التصميم:
- Tailwind CSS (لا shadcn/radix/mui)
- Dark theme: bg-[#0d1117], text-slate-200
- RTL: ms-/me- بدل ml-/mr-
- Primary color: hsl(var(--primary)) أو bg-primary
- لا axios (استخدم fetch)

### حدود موسعة:
- max search = 10
- max tools = 20
- لا حد على edit_component أو run_sql`,
    permissions: ["read_file", "search_text", "list_files", "list_components", "view_page_source", "get_page_structure", "browse_page", "screenshot_page", "scroll_page", "get_console_errors", "write_file", "edit_component", "create_component", "delete_file", "modify_styles", "db_read", "db_write", "db_tables", "manage_schema", "install_package", "restart_service", "deploy_status", "git_push", "trigger_deploy", "rollback_deploy", "verify_production", "set_env", "get_env", "system_status", "site_health", "manage_agents", "monitor_projects"],
    pipelineOrder: 6,
    receivesFrom: "infra_sysadmin",
    sendsTo: "infra_sysadmin",
    roleOnReceive: "يستقبل أوامر التنفيذ من المالك مباشرة أو من الوكلاء المحللين",
    roleOnSend: "يسلّم نتائج التنفيذ مع الأدلة والتفاصيل",
    tokenLimit: 100000,
    batchSize: 10,
    creativity: "0.50",
    sourceFiles: [
      "artifacts/api-server/src/routes/infra.ts",
      "artifacts/api-server/src/lib/agents/strategic-agent.ts",
      "artifacts/website-builder/src/pages/AgentManagement.tsx",
      "lib/db/src/schema/index.ts",
      "Dockerfile",
      ".github/workflows/deploy-cloud-run.yml",
    ],
  },
];

async function seedInfraAgents() {
  try {
    const allExisting = await db.select({ agentKey: agentConfigsTable.agentKey, agentLayer: agentConfigsTable.agentLayer })
      .from(agentConfigsTable);
    const existingKeys = new Set(allExisting.map(a => a.agentKey));

    for (const retiredKey of RETIRED_AGENTS) {
      if (existingKeys.has(retiredKey)) {
        await db.update(agentConfigsTable).set({ enabled: false })
          .where(eq(agentConfigsTable.agentKey, retiredKey));
      }
    }

    for (const agent of DEFAULT_INFRA_AGENTS) {
      if (!existingKeys.has(agent.agentKey)) {
        await db.insert(agentConfigsTable).values({
          agentKey: agent.agentKey,
          agentLayer: "infra",
          displayNameEn: agent.displayNameEn,
          displayNameAr: agent.displayNameAr,
          description: agent.description,
          enabled: true,
          primaryModel: agent.primaryModel,
          secondaryModel: agent.secondaryModel,
          tertiaryModel: agent.tertiaryModel,
          governorEnabled: agent.governorEnabled,
          autoGovernor: agent.autoGovernor,
          governorModel: agent.governorModel,
          systemPrompt: agent.systemPrompt,
          instructions: agent.instructions,
          permissions: agent.permissions,
          pipelineOrder: agent.pipelineOrder,
          receivesFrom: agent.receivesFrom,
          sendsTo: agent.sendsTo,
          roleOnReceive: agent.roleOnReceive,
          roleOnSend: agent.roleOnSend,
          tokenLimit: agent.tokenLimit,
          batchSize: agent.batchSize,
          creativity: agent.creativity,
          sourceFiles: agent.sourceFiles,
          shortTermMemory: [],
          longTermMemory: [],
        });
      } else {
        await db.update(agentConfigsTable).set({
          agentLayer: "infra",
          displayNameEn: agent.displayNameEn,
          displayNameAr: agent.displayNameAr,
          description: agent.description,
          enabled: true,
          primaryModel: agent.primaryModel,
          systemPrompt: agent.systemPrompt,
          instructions: agent.instructions,
          permissions: agent.permissions,
          pipelineOrder: agent.pipelineOrder,
          receivesFrom: agent.receivesFrom,
          sendsTo: agent.sendsTo,
          roleOnReceive: agent.roleOnReceive,
          roleOnSend: agent.roleOnSend,
          tokenLimit: agent.tokenLimit,
          batchSize: agent.batchSize,
          creativity: agent.creativity,
          sourceFiles: agent.sourceFiles,
        }).where(eq(agentConfigsTable.agentKey, agent.agentKey));
      }
    }
    console.log("[Infra] Seeded/updated infra agents (6 active, retired:", RETIRED_AGENTS.join(", "), ")");
  } catch (err: any) {
    console.error("[Infra] Seed error:", err.message);
  }
}

seedInfraAgents();

const infraSessions = new Map<string, { role: "user" | "assistant"; content: string }[]>();

router.get("/ui-texts", async (req, res) => {
  try {
    const lang = (req.query.lang as string) || "ar";
    const rows = await db.select().from(uiTextOverridesTable).where(eq(uiTextOverridesTable.lang, lang));
    const overrides: Record<string, string> = {};
    for (const row of rows) {
      overrides[row.key] = row.value;
    }
    res.json({ overrides });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/ui-texts", async (req, res) => {
  try {
    const { key, value, lang = "ar" } = req.body;
    if (!key || !value) return res.status(400).json({ error: "key and value required" });
    await db.insert(uiTextOverridesTable)
      .values({ key, value, lang })
      .onConflictDoUpdate({
        target: [uiTextOverridesTable.key, uiTextOverridesTable.lang],
        set: { value, updatedAt: new Date() },
      });
    res.json({ success: true, key, value, lang });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ui-styles", async (req, res) => {
  try {
    const page = (req.query.page as string) || "*";
    const rows = await db.select().from(uiStyleOverridesTable);
    const styles = rows.filter((r: any) => r.page === "*" || r.page === page);
    res.json({ styles });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/ui-styles", async (req, res) => {
  try {
    const { selector, property, value, page = "*" } = req.body;
    if (!selector || !property || !value) return res.status(400).json({ error: "selector, property and value required" });
    await db.insert(uiStyleOverridesTable)
      .values({ selector, property, value, page })
      .onConflictDoUpdate({
        target: [uiStyleOverridesTable.selector, uiStyleOverridesTable.property],
        set: { value, page, updatedAt: new Date() },
      });
    res.json({ success: true, selector, property, value, page });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/ui-styles/:id", async (req, res) => {
  try {
    await db.delete(uiStyleOverridesTable).where(eq(uiStyleOverridesTable.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/edit-history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const tableName = req.query.table as string;
    let query = db.select().from(uiEditHistoryTable).orderBy(desc(uiEditHistoryTable.createdAt)).limit(limit);
    if (tableName) {
      query = db.select().from(uiEditHistoryTable).where(eq(uiEditHistoryTable.tableName, tableName)).orderBy(desc(uiEditHistoryTable.createdAt)).limit(limit);
    }
    const history = await query;
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/edit-history/rollback/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [record] = await db.select().from(uiEditHistoryTable).where(eq(uiEditHistoryTable.id, id));
    if (!record) return res.status(404).json({ error: "Record not found" });

    if (record.tableName === "ui_text_overrides") {
      if (record.oldValue === null) {
        await db.delete(uiTextOverridesTable).where(
          and(eq(uiTextOverridesTable.key, record.recordKey), eq(uiTextOverridesTable.lang, record.lang || "ar"))
        );
      } else {
        await db.insert(uiTextOverridesTable)
          .values({ key: record.recordKey, value: record.oldValue, lang: record.lang || "ar" })
          .onConflictDoUpdate({
            target: [uiTextOverridesTable.key, uiTextOverridesTable.lang],
            set: { value: record.oldValue, updatedAt: new Date() },
          });
      }

      await db.insert(uiEditHistoryTable).values({
        tableName: "ui_text_overrides",
        recordKey: record.recordKey,
        field: "value",
        oldValue: record.newValue,
        newValue: record.oldValue || "(deleted)",
        lang: record.lang,
        editedBy: "rollback",
      });
    } else if (record.tableName === "ui_style_overrides") {
      const [selectorPart, propertyPart] = record.recordKey.split("::");
      if (record.oldValue === null) {
        await db.delete(uiStyleOverridesTable).where(
          and(eq(uiStyleOverridesTable.selector, selectorPart), eq(uiStyleOverridesTable.property, propertyPart))
        );
      } else {
        await db.insert(uiStyleOverridesTable)
          .values({ selector: selectorPart, property: propertyPart, value: record.oldValue })
          .onConflictDoUpdate({
            target: [uiStyleOverridesTable.selector, uiStyleOverridesTable.property],
            set: { value: record.oldValue, updatedAt: new Date() },
          });
      }

      await db.insert(uiEditHistoryTable).values({
        tableName: "ui_style_overrides",
        recordKey: record.recordKey,
        field: "value",
        oldValue: record.newValue,
        newValue: record.oldValue || "(deleted)",
        lang: "*",
        editedBy: "rollback",
      });
    }

    res.json({ success: true, rolledBack: { key: record.recordKey, from: record.newValue, to: record.oldValue } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/edit-history/rollback-to-date", async (req, res) => {
  try {
    const { before } = req.body;
    if (!before) return res.status(400).json({ error: "before date required" });
    const beforeDate = new Date(before);

    const editsAfter = await db.select().from(uiEditHistoryTable)
      .where(sql`${uiEditHistoryTable.createdAt} > ${beforeDate}`)
      .orderBy(desc(uiEditHistoryTable.createdAt));

    let rolledBackCount = 0;
    for (const record of editsAfter) {
      if (record.editedBy === "rollback") continue;

      if (record.tableName === "ui_text_overrides") {
        if (record.oldValue === null) {
          await db.delete(uiTextOverridesTable).where(
            and(eq(uiTextOverridesTable.key, record.recordKey), eq(uiTextOverridesTable.lang, record.lang || "ar"))
          );
        } else {
          await db.insert(uiTextOverridesTable)
            .values({ key: record.recordKey, value: record.oldValue, lang: record.lang || "ar" })
            .onConflictDoUpdate({
              target: [uiTextOverridesTable.key, uiTextOverridesTable.lang],
              set: { value: record.oldValue, updatedAt: new Date() },
            });
        }
        rolledBackCount++;
      } else if (record.tableName === "ui_style_overrides") {
        const [selectorPart, propertyPart] = record.recordKey.split("::");
        if (record.oldValue === null) {
          await db.delete(uiStyleOverridesTable).where(
            and(eq(uiStyleOverridesTable.selector, selectorPart), eq(uiStyleOverridesTable.property, propertyPart))
          );
        } else {
          await db.insert(uiStyleOverridesTable)
            .values({ selector: selectorPart, property: propertyPart, value: record.oldValue })
            .onConflictDoUpdate({
              target: [uiStyleOverridesTable.selector, uiStyleOverridesTable.property],
              set: { value: record.oldValue, updatedAt: new Date() },
            });
        }
        rolledBackCount++;
      }
    }

    await db.insert(uiEditHistoryTable).values({
      tableName: "system",
      recordKey: "rollback_to_date",
      field: "bulk",
      oldValue: null,
      newValue: `Rolled back ${rolledBackCount} edits before ${before}`,
      lang: "*",
      editedBy: "rollback",
    });

    res.json({ success: true, rolledBackCount, beforeDate: before });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/infra/system-defaults", requireInfraAdmin, async (_req, res) => {
  try {
    const { SYSTEM_DEFAULTS } = await import("../config/system-defaults");
    res.json({ success: true, defaults: SYSTEM_DEFAULTS });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/infra/diagnostics", async (_req, res) => {
  try {
    const { executeInfraTool } = await import("../lib/agents/strategic-agent");
    const searchResult = await executeInfraTool("search_text", { text: "home_create_app", filePattern: "*.tsx" }, "admin");
    const listResult = await executeInfraTool("list_files", { directory: "artifacts/website-builder/src" }, "admin");
    let listParsed: any = null;
    try { listParsed = JSON.parse(listResult); } catch {}
    res.json({
      env: process.env.NODE_ENV,
      cwd: process.cwd(),
      searchWorking: searchResult && searchResult.includes("found"),
      searchSample: searchResult?.slice(0, 500),
      srcFileCount: listParsed?.entries?.length || 0,
      srcSample: listParsed?.entries?.slice(0, 5) || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/infra/reset-defaults", requireInfraAdmin, async (_req, res) => {
  try {
    const { SYSTEM_DEFAULTS } = await import("../config/system-defaults");
    for (const agent of DEFAULT_INFRA_AGENTS) {
      await db.update(agentConfigsTable).set({
        agentLayer: "infra",
        displayNameEn: agent.displayNameEn,
        displayNameAr: agent.displayNameAr,
        description: agent.description,
        enabled: true,
        primaryModel: agent.primaryModel,
        systemPrompt: agent.systemPrompt,
        instructions: agent.instructions,
        permissions: agent.permissions,
        pipelineOrder: agent.pipelineOrder,
        receivesFrom: agent.receivesFrom,
        sendsTo: agent.sendsTo,
        roleOnReceive: agent.roleOnReceive,
        roleOnSend: agent.roleOnSend,
        tokenLimit: agent.tokenLimit,
        batchSize: agent.batchSize,
        creativity: agent.creativity,
        sourceFiles: agent.sourceFiles,
      }).where(eq(agentConfigsTable.agentKey, agent.agentKey));
    }
    console.log("[Infra] System reset to defaults v" + SYSTEM_DEFAULTS.version);
    res.json({ success: true, message: "تم إعادة النظام للإعدادات الافتراضية", version: SYSTEM_DEFAULTS.version });
  } catch (err: any) {
    console.error("[Infra] Reset defaults error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/infra/access-status", requireInfraAdmin, (_req, res) => {
  res.json({ enabled: getInfraAccessEnabled() });
});

router.post("/infra/access-toggle", requireInfraAdmin, async (req, res) => {
  const { enabled } = req.body as { enabled: boolean };
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: { message: "enabled must be a boolean" } });
  }
  await setInfraAccessEnabled(enabled);
  console.log(`[Infra] Infrastructure access ${enabled ? "ENABLED" : "DISABLED"} by admin`);
  res.json({ enabled: getInfraAccessEnabled(), message: enabled ? "Infrastructure access enabled" : "Infrastructure access disabled" });
});

router.get("/infra/agents", async (_req, res) => {
  try {
    const agents = await db.select({
      id: agentConfigsTable.id,
      agentKey: agentConfigsTable.agentKey,
      displayNameEn: agentConfigsTable.displayNameEn,
      displayNameAr: agentConfigsTable.displayNameAr,
      description: agentConfigsTable.description,
      enabled: agentConfigsTable.enabled,
      primaryModel: agentConfigsTable.primaryModel,
    }).from(agentConfigsTable)
      .where(eq(agentConfigsTable.agentLayer, "infra"));
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post("/infra/chat-stream", requireInfraAdmin, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { agentKey, message, context } = req.body as { agentKey: string; message: string; context?: { currentPage?: string; fullUrl?: string; projectId?: string | null; mode?: string; lang?: string } };

    if (!message?.trim()) {
      res.status(400).json({ error: { message: "Message is required" } });
      return;
    }
    if (!agentKey) {
      res.status(400).json({ error: { message: "agentKey is required" } });
      return;
    }

    const [config] = await db.select().from(agentConfigsTable)
      .where(and(eq(agentConfigsTable.agentKey, agentKey), eq(agentConfigsTable.agentLayer, "infra")))
      .limit(1);

    if (!config || !config.enabled) {
      res.status(404).json({ error: { message: "Infrastructure agent not found or disabled" } });
      return;
    }

    const blueprint = getSystemBlueprint();

    const infraSystemPrompt = `أنت ${config.displayNameAr} (${config.displayNameEn}) — وكيل بنية تحتية لمنصة Mr Code AI.

دورك: ${config.description}

أنت تعمل على البنية التحتية للمنصة نفسها — لست وكيل خدمة عملاء.
المالك يتحدث معك مباشرة ويطلب منك مهام تتعلق بالنظام.
أنت system agent — لديك صلاحيات كاملة ولا تحتاج تسجيل دخول.

${blueprint}

أنت تعمل في بيئة حقيقية — لديك وصول مباشر لكل شيء: الملفات، قاعدة البيانات، الطرفية، المتصفح، GitHub.

🔍 أدوات البحث:
- search_text: بحث في كل الملفات. Input: { text: "النص المطلوب" }
- list_files: تصفح مجلدات. Input: { directory: "artifacts/website-builder/src", recursive: true }
- run_command: أمر shell. Input: { command: "ls -la" }
- list_components: مكونات الواجهة. Input: { directory: "src" }

📁 أدوات الملفات:
- read_file: قراءة ملف. Input: { path: "artifacts/website-builder/src/lib/i18n.tsx" }
- write_file: كتابة ملف. Input: { path, content }
- edit_component: تعديل دقيق. Input: { componentPath: "src/lib/i18n.tsx", old_text: "القديم", new_text: "الجديد" }. المسار نسبي لـ website-builder/.
- create_component: إنشاء ملف. Input: { componentPath: "src/components/New.tsx", content: "..." }
- view_page_source: قراءة مكون. Input: { componentPath: "src/pages/Home.tsx" }

🗄️ قاعدة البيانات:
- run_sql / db_query: تنفيذ SQL. Input: { query: "SELECT * FROM users" }
- db_tables: جميع الجداول. Input: { detailed: true }

🌐 المتصفح:
- screenshot_page: لقطة شاشة. Input: { path: "/" }
- click_element, type_text, hover_element, inspect_styles, get_page_structure, scroll_page
- get_console_errors, get_network_requests, browse_page, site_health

🚀 النشر:
- git_push, trigger_deploy, deploy_status, github_api, remote_server_api

🔧 النظام:
- system_status, get_env, set_env, exec_command

⛔ القواعد الأساسية:

1. منع الهلوسة: استخدم كلمات المالك بالضبط. "غيّر X إلى Y" → ابحث عن X. لا تخترع بديلاً.
2. مسار التنفيذ: search_text → read_file → edit_component (3 خطوات فقط). لا تشرح. لا تسأل.
3. الملفات الآمنة دائماً: i18n.tsx، index.css، App.tsx. غيرها تأكد أنها مستوردة.
4. بعد edit: قل "✔ تم: الملف + قبل + بعد + matchesReplaced". لا تقل "تم" إذا matchesReplaced=0.
5. ممنوع الأسئلة: لا تسأل "ماذا تقصد"، "أي ملف"، "هل أنت مسجل". ابحث ونفّذ.
6. حد البحث: max 3 search. نفس query لا يتكرر.
7. همزة: النظام يبحث بكل الأشكال. إذا matchedVariant مختلف → استخدمه في edit.
8. أوامر قصيرة: "نفذ"/"عدل"/"سو"/"execute" = نفّذ آخر طلب معلّق فوراً.
9. ممنوع: قول "سأفعل"/"دعني" بدون تنفيذ. نفّذ أو توقف.

⛔⛔ قاعدة قاعدة البيانات ⛔⛔

- إذا success !== true → قل "فشلت العملية" + السبب
- إذا rowsAffected === 0 → فشل
- بعد UPDATE ناجح → اعرض القيمة قبل وبعد

⚠️ بنية المسارات:
- الواجهة: artifacts/website-builder/src/
- الخلفية: artifacts/api-server/src/
- الترجمات: artifacts/website-builder/src/lib/i18n.tsx
- edit_component المسار نسبي لـ website-builder/ (مثلاً: src/lib/i18n.tsx)
- read_file المسار من جذر المشروع (مثلاً: artifacts/website-builder/src/lib/i18n.tsx)

🔍 تشخيص مشاكل شاشة المعاينة (Preview Diagnostics):

إذا المالك ذكر مشكلة في المعاينة أو شاشة بيضاء أو خطأ في موقع مولّد:
1. استخدم get_console_errors لجمع الأخطاء من الكونسول
2. استخدم get_page_structure لفحص بنية الصفحة
3. استخدم screenshot_page لالتقاط صورة للصفحة
4. استخدم get_network_requests لفحص طلبات الشبكة الفاشلة
5. حلل الأخطاء واقترح الحل المناسب — مثلاً:
   - شاشة بيضاء = خطأ JavaScript أو مكون مفقود
   - خطأ 404 = مسار أو ملف غير موجود
   - خطأ CORS = مشكلة في إعدادات الخادم
   - timeout = مشكلة في الاتصال أو API
6. إذا قدرت تصلح المشكلة (ملف ناقص، خطأ في الكود) → صلحها مباشرة بـ edit_component

🌍 قاعدة اللغة الثنائية (Bilingual Rule):

أنت تعمل في بيئة ثنائية اللغة (عربي + إنجليزي).
- المالك يتحدث بالعربي → شاهد الصفحة بالعربي (lang=ar)
- كل تعديل نص يتم تلقائياً بالعربي والإنجليزي (النظام يترجم تلقائياً)
- عند استخدام browse_page أو screenshot_page → أرسل lang من context المستخدم
- لا تحتاج تسأل "أي لغة" — النظام يعرف من الـ context

⛔ ممنوع ترجع JSON مثل {"decisionType": ...}. المالك يريد تنفيذ.

⛔⛔⛔ القانون الثامن: النشر الآمن (Safe Deploy Chain) ⛔⛔⛔

بعد أي edit_component أو write_file ناجح (matchesReplaced > 0):

خطوة 1: edit_component / write_file ← (تم)
خطوة 2: git_push مع message يصف التغيير (يتطلب موافقة المالك)
  - النظام يأخذ backup tag تلقائياً قبل كل push
  - ممنوع --force! Push عادي فقط
خطوة 3: deploy_status للتأكد من حالة CI/CD
خطوة 4: verify_production مع النص المتوقع للتأكد من ظهوره في الموقع الحقيقي

⚠️ git_push يتطلب موافقة المالك (approval).
⚠️ CI/CD يستغرق ~3 دقائق. بعدها verify_production.

إذا verify_production أرجع found=false:
→ التغيير لم يظهر في الإنتاج = فشل! أخبر المالك.

أدوات التراجع:
- rollback_deploy مع tag (يتطلب موافقة) — يرجع لنسخة سابقة

الرد النهائي:
✔ تم التعديل والنشر:
  الملف: [path]
  قبل: [old] → بعد: [new]
  النشر: ✅ تم الدفع لـ GitHub
  backup: [backup-tag]
  التحقق: ✅ النص ظاهر في mrcodeai.com

❌ فشل:
  السبب: [التعديل فشل / النشر فشل / النص غير ظاهر في الإنتاج]

⚠️ أهم قاعدة: التعديل في dev فقط لا يكفي! يجب git_push + verify_production.

القواعد العامة:
- رد بالعربية إذا المالك يتحدث بالعربية
- كن مختصراً — لا تشرح ماذا ستفعل، افعل وأخبر بالنتيجة
- نفّذ أولاً، أبلغ ثانياً
${config.instructions ? `\n\nتعليمات إضافية:\n${config.instructions}` : ""}
${config.permissions && Array.isArray(config.permissions) && config.permissions.length > 0 ? `\nصلاحياتك: ${config.permissions.join(", ")}` : ""}`;

    const sKey = `infra_${userId}_${agentKey}`;
    const history = infraSessions.get(sKey) || [];

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const slot = config.primaryModel;
    let fullReply = "";
    let tokensUsed = 0;

    const PERM_TO_TOOLS: Record<string, string[]> = {
      search_text: ["search_text"],
      list_files: ["list_files"],
      list_components: ["list_components"],
      read_file: ["read_file"],
      view_page_source: ["view_page_source"],
      write_file: ["write_file"],
      edit_component: ["edit_component"],
      create_component: ["create_component"],
      delete_file: ["exec_command"],
      rename_file: ["exec_command"],
      db_read: ["db_query", "db_tables"],
      db_write: ["run_sql"],
      db_admin: ["run_sql"],
      db_tables: ["db_tables"],
      run_command: ["run_command"],
      exec_command: ["exec_command"],
      get_env: ["get_env"],
      set_env: ["set_env"],
      system_status: ["system_status"],
      install_package: ["exec_command"],
      restart_service: ["exec_command"],
      screenshot_page: ["screenshot_page"],
      click_element: ["click_element"],
      type_text: ["type_text"],
      hover_element: ["hover_element"],
      inspect_styles: ["inspect_styles"],
      get_page_structure: ["get_page_structure"],
      scroll_page: ["scroll_page"],
      get_console_errors: ["get_console_errors"],
      get_network_requests: ["get_network_requests"],
      browse_page: ["browse_page"],
      site_health: ["site_health"],
      git_push: ["git_push"],
      trigger_deploy: ["trigger_deploy"],
      deploy_status: ["deploy_status"],
      github_api: ["github_api"],
      remote_server_api: ["remote_server_api"],
      rollback_deploy: ["exec_command"],
      manage_users: ["run_sql", "db_query"],
      view_secrets: ["get_env"],
      manage_agents: ["read_file", "write_file", "edit_component"],
      monitor_projects: ["get_project_status", "get_project_logs", "list_project_files"],
      get_project_status: ["get_project_status"],
      get_project_logs: ["get_project_logs"],
      list_project_files: ["list_project_files"],
    };

    const agentPerms = config.permissions || [];
    let filteredTools = INFRA_TOOLS;
    if (agentPerms.length > 0) {
      const allowedToolNames = new Set<string>();
      for (const perm of agentPerms) {
        const toolNames = PERM_TO_TOOLS[perm];
        if (toolNames) toolNames.forEach(t => allowedToolNames.add(t));
      }
      filteredTools = INFRA_TOOLS.filter((t: any) => allowedToolNames.has(t.name));
      if (filteredTools.length === 0) filteredTools = [];
    }

    const EMERGENCY_ONLY_TOOLS = new Set(["run_command", "exec_command"]);
    filteredTools = filteredTools.filter((t: any) => !EMERGENCY_ONLY_TOOLS.has(t.name));

    const earlyDetectedLang = /[\u0600-\u06FF]/.test(typeof message === "string" ? message : "") ? "ar" : "en";
    const userLang = context?.lang || earlyDetectedLang;
    const userCurrentPage = context?.currentPage || "/dashboard";

    let enrichedMessage = message;
    if (context?.currentPage) {
      const ctxLines: string[] = [`📍 السياق:`];
      ctxLines.push(`• الصفحة: ${context.currentPage}`);
      if (context.projectId) ctxLines.push(`• المشروع: ${context.projectId}`);
      ctxLines.push(`• الوضع: ${context.mode || "unknown"}`);
      ctxLines.push(`• اللغة: ${userLang}`);
      ctxLines.push(`\n⚠️ عند استخدام browse_page أو get_page_structure — استخدم الصفحة الحالية "${context.currentPage}" مع lang="${userLang}"`);
      enrichedMessage = `${ctxLines.join("\n")}\n\n📝 رسالة المستخدم:\n${message}`;
    }

    const conversationMessages = [
      ...history.slice(-6).map(m => {
        if (m.role === "assistant" && Array.isArray(m.content)) {
          const trimmed = m.content.map((b: any) => {
            if (b.type === "tool_result" && typeof b.content === "string" && b.content.length > 300) {
              return { ...b, content: b.content.slice(0, 300) + "..." };
            }
            return b;
          });
          return { ...m, content: trimmed };
        }
        return m;
      }),
      { role: "user" as const, content: enrichedMessage },
    ];

    if (slot.provider === "anthropic") {
      const { getAnthropicClient } = await import("../lib/agents/ai-clients");
      const client = await getAnthropicClient();
      const chatMsgs: any[] = conversationMessages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      const maxLoops = 10;
      let searchCount = 0;
      let hasReadAfterSearch = true;
      let hasEdited = false;
      let hasDOMInspection = false;
      let domSource: "none" | "tool" | "search" | "user_input" | "forced_override" = "none";
      let domBlockCount = 0;
      let searchFoundFile = false;
      let editFileCount = 0;
      let toolActionCount = 0;
      const searchQueriesSet = new Set<string>();
      const searchQueries: string[] = [];
      const MAX_SEARCHES = 10;
      const MAX_ACTIONS_WITHOUT_EDIT = 8;
      const MAX_DOM_BLOCKS = 1;
      let searchWithNoResults = 0;

      const targetState = {
        found: false,
        file: null as string | null,
        stepsAfterFound: 0,
        mustEdit: false,
        commitSteps: 0,
      };

      const userMsg = typeof message === "string" ? message : "";
      const detectedLang = /[\u0600-\u06FF]/.test(userMsg) ? "ar" : "en";

      const decisionState = {
        domTextDetected: false,
        domText: null as string | null,
        uiSearchAttempted: false,
        i18nSearchAttempted: false,
        componentSearchAttempted: false,
        dbAllowed: false,
        failedSearchCount: 0,
      };

      const extractDOMText = (msg: string): string | null => {
        const textMatch = msg.match(/النص:\s*["']?(.+?)["']?\s*\n/);
        if (textMatch) return textMatch[1].trim();
        const selectedMatch = msg.match(/العنصر المحدد[^:]*:\s*(.+)/);
        if (selectedMatch) return selectedMatch[1].trim();
        const contentMatch = msg.match(/المحتوى:\s*["']?(.+?)["']?\s*\n/);
        if (contentMatch) return contentMatch[1].trim();
        return null;
      };

      const domText = extractDOMText(userMsg);
      if (domText) {
        decisionState.domTextDetected = true;
        decisionState.domText = domText;
        console.log(`[Decision] DOM text detected: "${domText.slice(0, 50)}"`);
      }

      const userDOMPatterns = [
        /class[=:]\s*["']([^"']+)["']/i,
        /\bclass(?:Name)?\s*[:=]\s*["']([^"']+)["']/i,
        /\bid\s*[:=]\s*["']([^"']+)["']/i,
        /(?:div|span|button|section|nav|header|footer|aside|main|ul|li|a|p|h[1-6])\.[\w.-]+/i,
        /المسار:\s*[^\n]+/,
        /النوع:\s*<\w+>/,
        /العنصر المحدد/,
      ];
      const hasUserDOMInfo = userDOMPatterns.some(p => p.test(userMsg));
      if (hasUserDOMInfo) {
        hasDOMInspection = true;
        domSource = "user_input";
        searchFoundFile = true;
        console.log(`[Agent] DOM info from user (magic wand) — DOM_SOURCE=user_input, searchFoundFile=true ✓`);
      }

      for (let loop = 0; loop < maxLoops; loop++) {

        if (toolActionCount >= 25 && !hasEdited) {
          const failMsg = `\n\n❌ ${toolActionCount} خطوات بدون تعديل. العمليات: ${searchQueries.join(" → ")}\n`;
          res.write(`data: ${JSON.stringify({ type: "chunk", text: failMsg })}\n\n`);
          fullReply += failMsg;
          console.log(`[Agent] STOPPED: ${toolActionCount}/25 tool actions without edit`);
          break;
        }

        let response: any = null;
        let currentText = "";
        const MAX_RETRIES = 3;
        for (let retryAttempt = 0; retryAttempt < MAX_RETRIES; retryAttempt++) {
          try {
            const stream = client.messages.stream({
              model: slot.model,
              max_tokens: Math.min(slot.maxTokens || 32000, 64000),
              system: infraSystemPrompt,
              messages: chatMsgs,
              ...(filteredTools.length > 0 ? { tools: filteredTools as any } : {}),
              temperature: Math.min(parseFloat(String(config.creativity)) || 0.5, 1.0),
            });

            currentText = "";
            stream.on("text", (text: string) => {
              currentText += text;
              fullReply += text;
              res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
            });

            response = await stream.finalMessage();
            break;
          } catch (retryErr: any) {
            const isOverloaded = retryErr.message?.includes("Overloaded") || retryErr.message?.includes("overloaded") || retryErr.status === 529;
            if (isOverloaded && retryAttempt < MAX_RETRIES - 1) {
              const waitSec = (retryAttempt + 1) * 5;
              console.log(`[Agent] Overloaded — retry ${retryAttempt + 1}/${MAX_RETRIES} after ${waitSec}s`);
              res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n⏳ الخادم محمّل — إعادة المحاولة بعد ${waitSec} ثانية...\n` })}\n\n`);
              await new Promise(r => setTimeout(r, waitSec * 1000));
              continue;
            }
            throw retryErr;
          }
        }
        if (!response) throw new Error("Failed after retries");
        tokensUsed += (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

        const toolUseBlocks = response.content.filter((b: any) => b.type === "tool_use");
        if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
          if (
            targetState.found &&
            userCurrentPage &&
            toolActionCount < 15
          ) {
            const textReply = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
            const isQuestion = /\?|ماذا تقصد|وضّح|ما الذي|هل تقصد|يرجى التوضيح|clarify|what do you mean/i.test(textReply);
            if (isQuestion) {
              console.log(`[Agent] ANTI_QUESTION: Agent tried to ask instead of executing. DOM=${decisionState.domTextDetected}, target=${targetState.file}. Forcing retry.`);
              const forceMsg = `⛔ لا تسأل — المعلومات متوفرة:\n• الصفحة: ${userCurrentPage}\n• اللغة: ${userLang}\n• العنصر: "${(decisionState.domText || "").slice(0, 40)}"\n• الملف: ${targetState.file}\n\n🔧 نفّذ المطلوب مباشرة باستخدام read_file ثم edit_component.`;
              chatMsgs.push({ role: "assistant", content: response.content });
              chatMsgs.push({ role: "user", content: forceMsg });
              continue;
            }
          }
          break;
        }

        chatMsgs.push({ role: "assistant", content: response.content });

        const toolResults: any[] = [];
        for (const tool of toolUseBlocks) {
          const riskCfg = TOOL_RISK_CONFIG[tool.name] || { risk: "medium", category: "unknown", requiresApproval: false, sandboxed: false };
          const toolStart = Date.now();

          // Security: block destructive SQL without approval (DROP, ALTER, TRUNCATE)
          // db_query (SELECT only) and run_sql (write) are handled by their own safety checks below

          const EXECUTOR_ONLY_TOOLS = new Set(["edit_component", "write_file", "create_component", "delete_file", "git_push", "trigger_deploy", "run_sql", "exec_command", "run_command", "set_env"]);
          const EXECUTOR_AGENTS = new Set(["infra_builder", "infra_deploy", "execution_engine"]);
          if (EXECUTOR_ONLY_TOOLS.has(tool.name) && !EXECUTOR_AGENTS.has(agentKey)) {
            const blocked = `⛔ EXECUTOR_ONLY — الأداة ${tool.name} محصورة بالوكلاء المنفّذين فقط (infra_builder, infra_deploy, execution_engine). الوكيل ${agentKey} من نوع thinker/specialist — ممنوع التنفيذ.`;
            res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n\n${blocked}\n` })}\n\n`);
            fullReply += `\n\n${blocked}\n`;
            await logAudit(agentKey, "blocked_executor_only", tool.name, tool.input, blocked, riskCfg.risk, "blocked");
            toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: blocked });
            continue;
          }

          if (agentPerms.length > 0) {
            const allowedNames = new Set<string>();
            for (const p of agentPerms) {
              const mapped = PERM_TO_TOOLS[p];
              if (mapped) mapped.forEach(t => allowedNames.add(t));
            }
            if (!allowedNames.has(tool.name)) {
              const blocked = `⛔ الأداة ${tool.name} غير مصرّح بها لهذا الوكيل`;
              res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n\n${blocked}\n` })}\n\n`);
              fullReply += `\n\n${blocked}\n`;
              await logAudit(agentKey, "blocked_permission", tool.name, tool.input, blocked, riskCfg.risk, "blocked");
              toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: blocked });
              continue;
            }
          }

          if (tool.name === "db_query") {
            const q = (tool.input as any)?.query || (tool.input as any)?.sql || "";
            if (!isReadOnlySQL(q)) {
              const blocked = `⛔ db_query للقراءة فقط (SELECT/EXPLAIN/SHOW/WITH). لتنفيذ كتابة استخدم run_sql (يتطلب موافقة). الأمر المرفوض: ${q.slice(0, 50)}`;
              res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n\n${blocked}\n` })}\n\n`);
              await logAudit(agentKey, "blocked_db_write_via_query", tool.name, tool.input, blocked, "high", "blocked");
              toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: blocked });
              continue;
            }
          }

          if (tool.name === "run_sql" && agentPerms.includes("db_read") && !agentPerms.includes("db_write")) {
            const q = (tool.input as any)?.query || (tool.input as any)?.sql || "";
            if (!isReadOnlySQL(q)) {
              const blocked = `⛔ صلاحيتك db_read فقط — لا يمكن تنفيذ: ${q.slice(0, 50)}`;
              res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n\n${blocked}\n` })}\n\n`);
              await logAudit(agentKey, "blocked_db_write", tool.name, tool.input, blocked, "high", "blocked");
              toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: blocked });
              continue;
            }
          }

          if (tool.name === "run_sql" || tool.name === "db_query") {
            const q = (tool.input as any)?.query || (tool.input as any)?.sql || "";
            const sqlCheck = isSafeSQL(q);
            if (!sqlCheck.safe && !agentPerms.includes("db_admin")) {
              const blocked = `⛔ ${sqlCheck.reason} — تحتاج صلاحية db_admin`;
              res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n\n${blocked}\n` })}\n\n`);
              await logAudit(agentKey, "blocked_dangerous_sql", tool.name, tool.input, blocked, "critical", "blocked");
              toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: blocked });
              continue;
            }
          }

          // ═══════════════════════════════════════
          // T003: Approval Interception — high/critical tools
          // ═══════════════════════════════════════
          if (riskCfg.requiresApproval) {
            const explanation = `الوكيل ${agentKey} يطلب تنفيذ ${tool.name} (مستوى الخطورة: ${riskCfg.risk})`;
            const [newApproval] = await db.insert(aiApprovalsTable).values({
              agentKey,
              userId: req.user?.id,
              tool: tool.name,
              input: tool.input ? JSON.parse(JSON.stringify(tool.input)) : null,
              explanation,
              risk: riskCfg.risk,
              category: riskCfg.category,
              impact: `تنفيذ ${tool.name} — ${riskCfg.category}`,
              reversible: !["trigger_deploy", "git_push", "rollback_deploy"].includes(tool.name),
              status: "pending",
            }).returning();

            const approvalMsg = `⏳ AWAITING_APPROVAL — الأداة "${tool.name}" تتطلب موافقة يدوية.\n\n🔒 مستوى الخطورة: ${riskCfg.risk}\n📋 التفاصيل: ${JSON.stringify(tool.input).slice(0, 300)}\n\n🆔 رقم الطلب: ${newApproval.id}\n\nافتح لوحة الموافقات للقبول أو الرفض.`;
            res.write(`data: ${JSON.stringify({ type: "approval_request", approvalId: newApproval.id, tool: tool.name, risk: riskCfg.risk, input: tool.input })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n\n${approvalMsg}\n` })}\n\n`);
            fullReply += `\n\n${approvalMsg}\n`;
            await logAudit(agentKey, "awaiting_approval", tool.name, tool.input, { approvalId: newApproval.id }, riskCfg.risk, "pending", undefined, newApproval.id);
            toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: approvalMsg });
            continue;
          }

          // T003: Sandbox enforcement for system commands
          if (riskCfg.sandboxed && (tool.name === "exec_command" || tool.name === "run_command")) {
            const cmd = (tool.input as any)?.command || "";
            const dangerousPatterns = ["rm -rf /", "rm -rf /*", "mkfs", "> /dev/sd", "dd if=", ":(){ :|:& };:", "chmod -R 777 /", "shutdown", "reboot", "init 0"];
            const isDangerous = dangerousPatterns.some(p => cmd.includes(p));
            if (isDangerous) {
              const blocked = `⛔ SANDBOX_BLOCKED — الأمر محظور لأسباب أمنية: ${cmd.slice(0, 100)}`;
              res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n\n${blocked}\n` })}\n\n`);
              await logAudit(agentKey, "sandbox_blocked", tool.name, tool.input, blocked, "critical", "blocked");
              toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: blocked });
              continue;
            }
          }

          toolActionCount++;

          if (tool.name === "edit_component" || tool.name === "write_file") {
            targetState.mustEdit = false;
            targetState.commitSteps = 0;
          }

          if (targetState.mustEdit) {
            targetState.commitSteps++;
          }

          if (targetState.found && !targetState.mustEdit) {
            targetState.stepsAfterFound++;
          }

          if (tool.name === "search_text" || tool.name === "list_files" || tool.name === "list_components") {
            console.log(`[Agent] Step ${toolActionCount}: ${tool.name}(${JSON.stringify(tool.input).slice(0, 100)})`);
          }

          if (tool.name === "search_text") {
            const query = (tool.input as any)?.text || "";
            const normalizedQuery = query.trim().toLowerCase();

            if (searchQueriesSet.has(normalizedQuery)) {
              const info = `ℹ️ البحث عن "${query}" تم من قبل. جرّب بحث مختلف أو نفّذ التعديل.`;
              console.log(`[Agent] INFO: Repeated search query="${query}" — allowing anyway`);
            }

            if (searchCount >= MAX_SEARCHES) {
              const info = `ℹ️ بحثت ${searchCount} مرات. حاول نفّذ التعديل الآن.`;
              console.log(`[Agent] INFO: Search limit reached (${searchCount}/${MAX_SEARCHES}) — allowing anyway`);
            }

            searchCount++;
            searchQueriesSet.add(normalizedQuery);
            searchQueries.push(query);
            hasReadAfterSearch = false;
            console.log(`[Agent] Search #${searchCount}/${MAX_SEARCHES}: "${query}"`);
          }

          if (tool.name === "read_file" || tool.name === "view_page_source") {
            hasReadAfterSearch = true;
            if (searchCount > 0 || targetState.found) {
              searchFoundFile = true;
            }
            console.log(`[Agent] Read file — ready to edit directly, searchFoundFile=${searchFoundFile}`);
          }

          if (["get_page_structure", "browse_page", "inspect_styles"].includes(tool.name)) {
            hasDOMInspection = true;
            domSource = "tool";
            domBlockCount++;
            console.log(`[Agent] DOM inspection #${domBlockCount} via ${tool.name}`);
          }

          if (tool.name === "edit_component") {
            if (!hasDOMInspection) {
              if (searchFoundFile || hasReadAfterSearch || searchCount > 0 || domSource === "user_input") {
                hasDOMInspection = true;
                domSource = domSource === "user_input" ? "user_input" : "search";
                console.log(`[Agent] DOM not needed — edit allowed via ${domSource} ✓`);
              } else {
                hasDOMInspection = true;
                domSource = "forced_override";
                console.log(`[Agent] DOM skipped — edit_component proceeds without DOM (no blocking) ✓`);
              }
            }
          }

          if (tool.name === "edit_component" || tool.name === "write_file" || tool.name === "create_component") {
            hasEdited = true;
            const editPath = (tool.input as any)?.componentPath || (tool.input as any)?.path || "";
            const oldText = (tool.input as any)?.old_text || "";
            const newText = (tool.input as any)?.new_text || "";
            console.log(`[Agent] Edit executed — file: ${editPath}, old_text: "${oldText.slice(0, 60)}", new_text: "${newText.slice(0, 60)}", domInspected: ${hasDOMInspection}`);
          }

          let needsApproval = riskCfg.requiresApproval;
          if (tool.name === "remote_server_api") {
            const method = ((tool.input as any)?.method || "GET").toUpperCase();
            if (method === "GET") needsApproval = false;
          }

          if (needsApproval) {
            const categoryAr: Record<string, string> = { files: "ملفات", database: "قاعدة بيانات", system: "نظام", deploy: "نشر", security: "أمان" };
            const riskAr: Record<string, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية", critical: "حرجة" };
            const inputSummary = JSON.stringify(tool.input || {}).slice(0, 200);

            const [approval] = await db.insert(aiApprovalsTable).values({
              agentKey,
              userId: userId || "system",
              tool: tool.name,
              input: tool.input as any,
              explanation: `الوكيل ${agentKey} يريد تنفيذ ${tool.name}`,
              risk: riskCfg.risk,
              category: riskCfg.category,
              impact: inputSummary,
              reversible: !["trigger_deploy", "delete_file", "run_sql"].includes(tool.name),
              status: "pending",
            }).returning();

            res.write(`data: ${JSON.stringify({
              type: "approval_request",
              id: approval.id,
              tool: tool.name,
              risk: riskCfg.risk,
              category: riskCfg.category,
              input: tool.input,
              inputSummary,
              reversible: !["trigger_deploy", "delete_file", "run_sql"].includes(tool.name),
            })}\n\n`);
            fullReply += `\n⏳ طلب موافقة: ${tool.name} (${approval.id})\n`;

            await logAudit(agentKey, "approval_requested", tool.name, tool.input, { approvalId: approval.id }, riskCfg.risk, "pending");
            toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `⏳ العملية ${tool.name} تنتظر موافقة المالك. رقم الطلب: ${approval.id}` });
            continue;
          }


          if (["get_page_structure", "browse_page", "screenshot_page", "scroll_page"].includes(tool.name)) {
            if (!(tool.input as any)?.lang) {
              (tool.input as any).lang = userLang;
            }
            if (!(tool.input as any)?.url && !(tool.input as any)?.path) {
              (tool.input as any).url = userCurrentPage;
              console.log(`[Agent] AUTO_CONTEXT: browse tool "${tool.name}" → using user's current page "${userCurrentPage}" lang="${userLang}"`);
            }
          }
          res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n\n...*${tool.name}*...\n` })}\n\n`);
          fullReply += `\n\n...*${tool.name}*...\n`;
          const result = await executeInfraTool(tool.name, tool.input, "admin");
          const durationMs = Date.now() - toolStart;

          await logAudit(agentKey, "tool_executed", tool.name, tool.input, result?.slice(0, 1000), riskCfg.risk, "success", durationMs);

          if (["get_page_structure", "browse_page", "inspect_styles"].includes(tool.name)) {
            const isConnectionError = result && (result.includes("Connection closed") || result.includes("error") && result.includes("timeout"));
            if (isConnectionError) {
              hasDOMInspection = true;
              domSource = "forced_override";
              console.log(`[Agent] DOM tool failed (Connection closed) — bypassing DOM requirement, fallback to search`);
              await logAudit(agentKey, "dom_tool_failed_bypass", tool.name, tool.input, result?.slice(0, 200), "low", "override");
            } else if (!decisionState.domTextDetected && result) {
              const toolDomText = extractDOMText(result);
              if (toolDomText) {
                decisionState.domTextDetected = true;
                decisionState.domText = toolDomText;
                console.log(`[Decision] DOM text extracted from ${tool.name}: "${toolDomText.slice(0, 50)}"`);
              }
            }
          }

          if (tool.name === "get_page_structure" || tool.name === "browse_page") {
            const stylePatterns = [
              /(?:غي[ّر]|بد[ّل]|حو[ّل]|خلي|اجعل|سوي)\s+(?:لون|خلفية|background|color)\s*(?:ها|ه|الـ?)?(?:\s+(?:ل|الى|إلى|بـ?))?\s*(?:لون\s+)?(.+?)$/i,
              /(?:غي[ّر]|بد[ّل])\s+لون(?:ها|ه)?\s+(?:ل|الى|إلى|بـ?)\s*(?:لون\s+)?(.+?)$/i,
              /(?:نزل|ارفع|حرك)\s+(?:هذ[اه]|هذي|الـ?)?(.+?)(?:\s+(?:للأسفل|للفوق|يمين|يسار|للأعلى))?$/i,
            ];

            const colorKeywords: Record<string, string> = {
              "الهوية البصرية": "hsl(var(--primary))",
              "الهوية البصريه": "hsl(var(--primary))",
              "البراند": "hsl(var(--primary))",
              "primary": "hsl(var(--primary))",
              "الأساسي": "hsl(var(--primary))",
              "أحمر": "#ef4444",
              "أخضر": "#22c55e",
              "أزرق": "#3b82f6",
              "أبيض": "#ffffff",
              "أسود": "#000000",
              "رمادي": "#6b7280",
              "برتقالي": "#f97316",
              "بنفسجي": "#8b5cf6",
              "وردي": "#ec4899",
            };

            let extractedSelector: string | null = null;
            if (result) {
              try {
                const parsed = JSON.parse(result);
                if (parsed.buttons) {
                  for (const btn of parsed.buttons) {
                    const btnMatch = btn.match(/class="([^"]+)".*?>(.+?)</);
                    if (btnMatch) {
                      const btnText = btnMatch[2].trim();
                      if (userMsg.includes(btnText) || (decisionState.domText && decisionState.domText.includes(btnText))) {
                        extractedSelector = `button.${btnMatch[1].split(" ")[0]}`;
                      }
                    }
                  }
                }
              } catch {}

              const classMatch = result.match(/class="([^"]+)"/);
              if (!extractedSelector && classMatch) {
                const firstClass = classMatch[1].split(" ").filter((c: string) => !c.includes(":") && !c.includes("[") && !c.includes("/")).slice(0, 3).join(".");
                if (firstClass) extractedSelector = `.${firstClass}`;
              }
            }

            const isColorRequest = /(?:غي[ّر]|بد[ّل])\s*(?:لون|خلفية|background|color)/i.test(userMsg);
            const isMoveRequest = /(?:نزل|ارفع|حرك)/i.test(userMsg);

            if ((isColorRequest || isMoveRequest) && extractedSelector) {
              let cssProperty = "";
              let cssValue = "";

              if (isColorRequest) {
                cssProperty = /خلفية|background/i.test(userMsg) ? "background-color" : "color";
                if (/لون(?:ها|ه)?.*(?:الى|إلى|ل|بـ)/i.test(userMsg) || /خلفية/i.test(userMsg)) {
                  cssProperty = "background-color";
                }
                for (const [keyword, value] of Object.entries(colorKeywords)) {
                  if (userMsg.includes(keyword)) {
                    cssValue = value;
                    break;
                  }
                }
                if (!cssValue) cssValue = "hsl(var(--primary))";
              } else if (isMoveRequest) {
                cssProperty = "margin-top";
                cssValue = /للفوق|للأعلى|ارفع/.test(userMsg) ? "-10px" : "10px";
              }

              if (cssProperty && cssValue) {
                try {
                  await db.insert(uiStyleOverridesTable)
                    .values({ selector: extractedSelector, property: cssProperty, value: cssValue })
                    .onConflictDoUpdate({
                      target: [uiStyleOverridesTable.selector, uiStyleOverridesTable.property],
                      set: { value: cssValue, updatedAt: new Date() },
                    });

                  const successMsg = `✅ تم تعديل الستايل فوراً!\n\n🎨 العنصر: ${extractedSelector}\n🔧 الخاصية: ${cssProperty}\n✨ القيمة: ${cssValue}\n\n🔄 أعد تحميل الصفحة لترى التغيير.`;
                  console.log(`[Agent] 🎨 DIRECT_STYLE: selector="${extractedSelector}" ${cssProperty}="${cssValue}"`);
                  res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n${successMsg}\n` })}\n\n`);
                  fullReply += `\n\n${successMsg}\n`;

                  try { await logAudit(agentKey, "direct_style_edit", "modify_styles", { selector: extractedSelector, property: cssProperty, value: cssValue }, { method: "db_style_override" }, "medium", "success"); } catch {}

                  res.write(`data: ${JSON.stringify({ type: "done", tokensUsed: 0, cost: "0.000000", model: "direct_engine" })}\n\n`);
                  try {
                    await db.insert(messagesTable).values({ conversationId: conv.id, role: "user", content: message });
                    await db.insert(messagesTable).values({ conversationId: conv.id, role: "assistant", content: successMsg, tokenCount: 0, costUsd: "0" });
                  } catch {}
                  res.end();
                  return;
                } catch (styleErr: any) {
                  console.error(`[Agent] DIRECT_STYLE failed: ${styleErr?.message?.slice(0, 200)}`);
                }
              }
            }
          }

          if (tool.name === "search_text") {
            const noResultIndicators = ["لم يتم", "no results", "not found", "0 matches", "لا يوجد", "no match"];
            const isActuallyEmpty = !result || result.trim().length < 5 || noResultIndicators.some(ind => (result || "").toLowerCase().includes(ind));

            if (isActuallyEmpty) {
              const replacePatterns = [
                /(?:غي[ّر]|بد[ّل]|استبدل|حو[ّل])\s+(?:كلمة\s+|نص\s+|عبارة\s+)?["«]?(.+?)["»]?\s+(?:في\s+.+?\s+)?(?:ال[ىي]|بـ?|لـ?|يصير|تصير|يكون)\s+["«]?(.+?)["»]?\s*$/i,
                /(?:غي[ّر]|بد[ّل]|استبدل|حو[ّل])\s+(?:كلمة\s+|نص\s+|عبارة\s+)?["«]?(.+?)["»]?\s+(?:ال[ىي]|بـ?|لـ?|يصير|تصير|يكون)\s+["«]?(.+?)["»]?\s*$/i,
                /(?:خلي|اجعل|سوي)\s+["«]?(.+?)["»]?\s+(?:يقول|تقول|يكتب|تكتب|يصير|تصير)\s+["«]?(.+?)["»]?\s*$/i,
                /["«](.+?)["»]\s*(?:→|->|=>|الى|إلى)\s*["«](.+?)["»]/i,
              ];
              let dbOldText: string | null = null;
              let dbNewText: string | null = null;
              for (const pat of replacePatterns) {
                const m = userMsg.match(pat);
                if (m && m[1]?.trim() && m[2]?.trim()) {
                  dbOldText = m[1].trim();
                  dbNewText = m[2].trim();
                  break;
                }
              }

              if (dbOldText && dbNewText) {
                const detectedLang = /[\u0600-\u06FF]/.test(dbOldText) ? "ar" : "en";
                try {
                  const existingOverrides = await db.select().from(uiTextOverridesTable).where(eq(uiTextOverridesTable.lang, detectedLang));
                  const matchedOverride = existingOverrides.find((o: any) => o.value === dbOldText);

                  if (matchedOverride) {
                    console.log(`[Agent] 🔥 DB_OVERRIDE_EDIT: found key="${matchedOverride.key}" value="${matchedOverride.value}" → "${dbNewText}"`);
                    res.write(`data: ${JSON.stringify({ type: "chunk", text: `✅ فهمت: "${dbOldText}" → "${dbNewText}"\n` })}\n\n`);
                    res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n⏳ جاري التعديل (عربي + إنجليزي)...\n` })}\n\n`);

                    const { otherLang, translatedValue } = await saveBilingualOverride(matchedOverride.key, dbNewText, detectedLang as "ar" | "en");

                    const successMsg = `✅ تم التعديل فوراً!\n\n🔑 المفتاح: ${matchedOverride.key}\n✏️ من: "${dbOldText}"\n➡️ ${detectedLang === "ar" ? "عربي" : "English"}: "${dbNewText}"\n➡️ ${otherLang === "ar" ? "عربي" : "English"}: "${translatedValue}"`;
                    res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n${successMsg}\n` })}\n\n`);
                    fullReply += `\n\n${successMsg}\n`;

                    try { await logAudit(agentKey, "db_override_edit", "edit_component", { key: matchedOverride.key, old: dbOldText, new: dbNewText, lang: detectedLang, translated: translatedValue, otherLang }, { method: "db_bilingual_update" }, "medium", "success"); } catch {}

                    res.write(`data: ${JSON.stringify({ type: "done", tokensUsed: 0, cost: "0.000000", model: "direct_engine" })}\n\n`);
                    try {
                      await db.insert(messagesTable).values({ conversationId: conv.id, role: "user", content: message });
                      await db.insert(messagesTable).values({ conversationId: conv.id, role: "assistant", content: successMsg, tokenCount: 0, costUsd: "0" });
                    } catch {}
                    res.end();
                    return;
                  } else {
                    const i18nFilePath = path.resolve(PROJECT_ROOT, "artifacts/website-builder/src/lib/i18n.tsx");
                    const i18nContent = fs.readFileSync(i18nFilePath, "utf-8");
                    const escapedOld = dbOldText!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const keyRegex = new RegExp(`(\\w+):\\s*["']${escapedOld}["']`);
                    const i18nRegexMatch = i18nContent.match(keyRegex);
                    if (i18nRegexMatch) {
                      const foundKey = i18nRegexMatch[1];
                      console.log(`[Agent] 🔥 I18N_STATIC_MATCH: key="${foundKey}" value="${dbOldText}" → "${dbNewText}"`);
                      res.write(`data: ${JSON.stringify({ type: "chunk", text: `✅ فهمت: "${dbOldText}" → "${dbNewText}"\n` })}\n\n`);
                      res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n⏳ جاري التعديل (عربي + إنجليزي)...\n` })}\n\n`);

                      const { otherLang: otherLang2, translatedValue: translatedValue2 } = await saveBilingualOverride(foundKey, dbNewText, detectedLang as "ar" | "en");

                      const successMsg = `✅ تم التعديل فوراً!\n\n🔑 المفتاح: ${foundKey}\n✏️ من: "${dbOldText}"\n➡️ ${detectedLang === "ar" ? "عربي" : "English"}: "${dbNewText}"\n➡️ ${otherLang2 === "ar" ? "عربي" : "English"}: "${translatedValue2}"`;
                      res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n${successMsg}\n` })}\n\n`);
                      fullReply += `\n\n${successMsg}\n`;

                      try { await logAudit(agentKey, "i18n_static_edit", "edit_component", { key: foundKey, old: dbOldText, new: dbNewText, lang: detectedLang, translated: translatedValue2, otherLang: otherLang2 }, { method: "db_bilingual_insert" }, "medium", "success"); } catch {}

                      res.write(`data: ${JSON.stringify({ type: "done", tokensUsed: 0, cost: "0.000000", model: "direct_engine" })}\n\n`);
                      try {
                        await db.insert(messagesTable).values({ conversationId: conv.id, role: "user", content: message });
                        await db.insert(messagesTable).values({ conversationId: conv.id, role: "assistant", content: successMsg, tokenCount: 0, costUsd: "0" });
                      } catch {}
                      res.end();
                      return;
                    }
                  }
                } catch (dbSearchErr: any) {
                  console.error(`[Agent] DB_OVERRIDE_SEARCH failed: ${dbSearchErr?.message?.slice(0, 200)}`);
                }
              }
            }

            const hasFileMatch = !isActuallyEmpty && result && /\.(tsx|jsx|ts|js|css|html|vue|svelte)/.test(result) && result.length > 10;
            if (hasFileMatch && !targetState.found) {
              let extractedFile = "unknown";
              let extractedLine = "";
              try {
                const parsed = JSON.parse(result);
                if (parsed.results && parsed.results.length > 0) {
                  const firstResult = parsed.results[0];
                  const parts = firstResult.split(":");
                  extractedFile = parts[0];
                  if (parts.length > 2) extractedLine = parts.slice(2).join(":").trim();
                }
              } catch {
                const fileMatch = result.match(/([\w\-./]+\.(tsx|jsx|ts|js|css|html|vue|svelte))/);
                if (fileMatch) extractedFile = fileMatch[1];
              }
              targetState.found = true;
              targetState.file = extractedFile;
              targetState.mustEdit = true;
              searchFoundFile = true;
              hasReadAfterSearch = true;
              console.log(`[Agent] search_text found → file="${targetState.file}", line="${extractedLine}", searchFoundFile=true`);

              // ═══════════════════════════════════════
              // 🔥 DIRECT EXECUTION — تنفيذ مباشر بدون Claude
              // يستخدم regex لفهم نية المستخدم تلقائياً
              // ═══════════════════════════════════════
              let directOldText: string | null = null;
              let directNewText: string | null = null;
              console.log(`[Agent] 🔥 DIRECT_EDIT: entering intent extraction block`);
              await logAudit(agentKey, "direct_edit_start", "system", { userMsg: userMsg.slice(0, 100), extractedFile }, null, "low", "started");

              try {
                const searchResultTexts: string[] = [];
                try {
                  const parsed = JSON.parse(result);
                  if (parsed.results) {
                    for (const r of parsed.results) {
                      const quotedMatch = r.match(/"([^"]+)"/);
                      if (quotedMatch) searchResultTexts.push(quotedMatch[1]);
                    }
                  }
                } catch {}

                const replacePatterns = [
                  /(?:غي[ّر]|بد[ّل]|استبدل|حو[ّل])\s+(?:كلمة\s+|نص\s+|عبارة\s+)?["«]?(.+?)["»]?\s+(?:ال[ىي]|بـ?|لـ?|يصير|تصير|يكون)\s+["«]?(.+?)["»]?\s*$/i,
                  /(?:غي[ّر]|بد[ّل]|استبدل|حو[ّل])\s+(?:كلمة\s+|نص\s+|عبارة\s+)?(.+?)\s+(?:ال[ىي]|بـ?|لـ?|يصير|تصير|يكون)\s+(.+?)$/i,
                  /(?:خلي|اجعل|سوي)\s+["«]?(.+?)["»]?\s+(?:يقول|تقول|يكتب|تكتب|يصير|تصير)\s+["«]?(.+?)["»]?\s*$/i,
                  /["«](.+?)["»]\s*(?:→|->|=>|الى|إلى)\s*["«](.+?)["»]/i,
                ];

                for (const pat of replacePatterns) {
                  const m = userMsg.match(pat);
                  if (m && m[1]?.trim() && m[2]?.trim()) {
                    let oldText = m[1].trim();
                    let newText = m[2].trim();

                    if (searchResultTexts.length > 0) {
                      const bestMatch = searchResultTexts.find(t => t.includes(oldText) || oldText.includes(t));
                      if (bestMatch) oldText = bestMatch;
                    }

                    directOldText = oldText;
                    directNewText = newText;
                    console.log(`[Agent] 🧠 REGEX_INTENT: "${directOldText}" → "${directNewText}"`);
                    res.write(`data: ${JSON.stringify({ type: "chunk", text: `✅ فهمت: "${directOldText}" → "${directNewText}"\n` })}\n\n`);
                    break;
                  }
                }

                if (!directOldText && searchResultTexts.length === 1) {
                  const changeWords = ["غير", "بدل", "استبدل", "حول", "خلي", "سوي"];
                  const hasChangeVerb = changeWords.some(w => userMsg.includes(w));
                  if (hasChangeVerb) {
                    const msgWithout = userMsg;
                    const foundText = searchResultTexts[0];
                    const afterPatterns = [
                      new RegExp(`(?:ال[ىي]|بـ?|لـ?|يصير|تصير|يكون|يقول|تقول)\\s+["«]?(.+?)["»]?\\s*$`),
                    ];
                    for (const ap of afterPatterns) {
                      const am = msgWithout.match(ap);
                      if (am && am[1]?.trim()) {
                        directOldText = foundText;
                        directNewText = am[1].trim();
                        console.log(`[Agent] 🧠 FUZZY_INTENT: "${directOldText}" → "${directNewText}"`);
                        res.write(`data: ${JSON.stringify({ type: "chunk", text: `✅ فهمت: "${directOldText}" → "${directNewText}"\n` })}\n\n`);
                        break;
                      }
                    }
                  }
                }

                if (!directOldText) {
                  console.log(`[Agent] 🧠 REGEX_INTENT: no match found in "${userMsg.slice(0, 80)}"`);
                }
              } catch (intentErr: any) {
                console.log(`[Agent] 🧠 INTENT ERROR: ${intentErr?.message?.slice(0, 200)}`);
              }

              await logAudit(agentKey, "direct_edit_intent_result", "system", { directOldText, directNewText, extractedFile }, null, "low", directOldText ? "matched" : "no_match");

              if (directOldText && directNewText && extractedFile !== "unknown") {
                try {
                  console.log(`[Agent] 🔥 DIRECT_EDIT: DB update path`);
                  res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n⏳ جاري التعديل...\n` })}\n\n`);

                  let i18nKey: string | null = null;
                  try {
                    const parsed = JSON.parse(result);
                    if (parsed.results && parsed.results.length > 0) {
                      const line = parsed.results[0];
                      const keyMatch = line.match(/^\S+:\d+:\s*(\w+):\s/);
                      if (keyMatch) i18nKey = keyMatch[1];
                      if (!i18nKey) {
                        const altMatch = line.match(/(\w+):\s*["'].*["']/);
                        if (altMatch) i18nKey = altMatch[1];
                      }
                    }
                  } catch {}

                  if (!i18nKey) {
                    const keyGuess = directOldText!.replace(/\s+/g, "_").replace(/[^\w]/g, "").slice(0, 40);
                    console.log(`[Agent] 🔥 DIRECT_EDIT: could not extract key, guessing from text: ${keyGuess}`);
                  }

                  const detectedLang = /[\u0600-\u06FF]/.test(directNewText!) ? "ar" : "en";

                  if (i18nKey) {
                    res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n⏳ جاري الترجمة التلقائية (عربي + إنجليزي)...\n` })}\n\n`);
                    const { otherLang: otherLang3, translatedValue: translatedValue3 } = await saveBilingualOverride(i18nKey, directNewText!, detectedLang as "ar" | "en");
                    console.log(`[Agent] 🔥 DIRECT_EDIT: DB bilingual updated key=${i18nKey} ${detectedLang}="${directNewText}" ${otherLang3}="${translatedValue3}"`);
                  } else {
                    throw new Error(`Could not determine i18n key for "${directOldText!.slice(0, 40)}"`);
                  }

                  hasEdited = true;
                  toolActionCount += 2;
                  const detectedLang3 = detectedLang;
                  const i18nKey3 = i18nKey;
                  const successMsg = `✅ تم التعديل فوراً!\n\n🔑 المفتاح: ${i18nKey3}\n✏️ من: "${directOldText}"\n➡️ ${detectedLang3 === "ar" ? "عربي" : "English"}: "${directNewText}"\n➡️ تم ترجمته تلقائياً للغة الأخرى`;

                  res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n${successMsg}\n` })}\n\n`);
                  fullReply += `\n\n${successMsg}\n`;

                  try { await logAudit(agentKey, "direct_edit_executed", "edit_component", { key: i18nKey3, old: directOldText, new: directNewText, lang: detectedLang3 }, { method: "db_bilingual_override" }, "medium", "success"); } catch {}

                  res.write(`data: ${JSON.stringify({ type: "done", tokensUsed: 0, cost: "0.000000", model: "direct_engine" })}\n\n`);
                  try {
                    await db.insert(messagesTable).values({ conversationId: conv.id, role: "user", content: message });
                    await db.insert(messagesTable).values({ conversationId: conv.id, role: "assistant", content: successMsg, tokenCount: 0, costUsd: "0" });
                  } catch {}
                  res.end();
                  return;
                } catch (directErr: any) {
                  const errMsg = directErr?.message?.slice(0, 300) || "unknown";
                  console.error(`[Agent] 🔥 DIRECT_EDIT FAILED: ${errMsg}`);
                  res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n❌ خطأ في التعديل المباشر: ${errMsg.slice(0, 150)}\nجاري المحاولة عبر Claude...\n` })}\n\n`);
                  try { await logAudit(agentKey, "direct_edit_failed_fallback", "edit_component", { file: extractedFile, old: directOldText, new: directNewText, error: errMsg }, null, "medium", "failed"); } catch {}
                }
              }
              // ═══════════════════════════════════════
              // END DIRECT EXECUTION — fallback to Claude
              // ═══════════════════════════════════════

              let autoReadContent = "";
              try {
                const autoRead = await executeInfraTool("read_file", { path: extractedFile }, "admin");
                const readParsed = JSON.parse(autoRead);
                if (readParsed.content) {
                  autoReadContent = `\n\n📄 AUTO_READ — محتوى الملف "${extractedFile}":\n\`\`\`\n${readParsed.content.slice(0, 8000)}\n\`\`\``;
                  console.log(`[Agent] AUTO_READ: ${extractedFile} (${readParsed.content.length} chars)`);
                  res.write(`data: ${JSON.stringify({ type: "tool_result", name: "read_file", result: `تم قراءة ${extractedFile} (${readParsed.content.length} حرف)` })}\n\n`);
                }
              } catch (readErr: any) {
                console.log(`[Agent] AUTO_READ failed: ${readErr?.message?.slice(0, 100)}`);
              }

              const searchContent = result + `\n\n🔧 تم تحديد الملف "${targetState.file}" وقراءته تلقائياً.${autoReadContent}\n\n⚡ نفّذ edit_component مباشرة الآن — لا تبحث ولا تقرأ مرة ثانية.`;
              res.write(`data: ${JSON.stringify({ type: "tool_result", name: tool.name, result: (result + `\n\n🔧 تم تحديد الملف "${targetState.file}" وقراءته تلقائياً. جاري التعديل...`).slice(0, 5000) })}\n\n`);
              toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: searchContent });
              continue;
            } else if (!hasFileMatch) {
              searchWithNoResults++;
              console.log(`[Agent] search_text: no results (${searchWithNoResults})`);
              const noResultContent = (result || "لم يتم العثور على نتائج") + `\n\n💡 النص غير موجود في الكود. جرّب بحث مختلف أو read_file مباشرة.`;
              res.write(`data: ${JSON.stringify({ type: "tool_result", name: tool.name, result: noResultContent.slice(0, 5000) })}\n\n`);
              toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: noResultContent });
              continue;
            }
          }

          let parsedResult: any = null;
          try { parsedResult = JSON.parse(result); } catch {}

          if (parsedResult?.type === "screenshot" && parsedResult?.base64) {
            const ssePayload = { ...parsedResult };
            const previewBase64 = parsedResult.base64.slice(0, 200) + "...[truncated]";
            res.write(`data: ${JSON.stringify({ type: "tool_result", name: tool.name, result: JSON.stringify({ ...ssePayload, base64: previewBase64 }), hasScreenshot: true, screenshotBase64: parsedResult.base64 })}\n\n`);

            toolResults.push({
              type: "tool_result",
              tool_use_id: tool.id,
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: parsedResult.base64,
                  },
                },
                {
                  type: "text",
                  text: parsedResult.message || `Screenshot from ${tool.name}`,
                },
              ],
            });
          } else {
            let finalContent = result;

            if (tool.name === "edit_component" && parsedResult) {
              const matchesReplaced = parsedResult.matchesReplaced ?? 0;
              const editPath = parsedResult.path || (tool.input as any)?.componentPath || "";
              if (matchesReplaced === 0 || parsedResult.success === false) {
                finalContent = `⚠️ EDIT_FAILED: التعديل لم يتم! matchesReplaced=${matchesReplaced}. الملف: ${editPath}. السبب المحتمل: old_text لا يطابق محتوى الملف بالضبط. جرّب read_file لقراءة الملف ونسخ النص الصحيح، أو انتقل للملف التالي في نتائج البحث.\n\n${result}`;
                hasEdited = false;
                console.log(`[Agent] EDIT FAILED: matchesReplaced=${matchesReplaced} in ${editPath}`);
                await logAudit(agentKey, "edit_failed", tool.name, tool.input, { matchesReplaced, path: editPath }, "medium", "failed", durationMs);
              } else {
                const oldText = ((tool.input as any)?.old_text || "").slice(0, 80);
                const newText = ((tool.input as any)?.new_text || "").slice(0, 80);

                const isUIFile = /\.(tsx|jsx|css|html|vue|svelte)$/i.test(editPath);
                let uiVerification = "";
                if (isUIFile) {
                  try {
                    const verifyResult = await executeInfraTool("screenshot_page", { path: "/" }, "admin");
                    let verifyParsed: any = null;
                    try { verifyParsed = JSON.parse(verifyResult); } catch {}
                    if (verifyParsed?.base64) {
                      res.write(`data: ${JSON.stringify({ type: "tool_result", name: "auto_verify_screenshot", result: "تم أخذ صورة للتحقق البصري", hasScreenshot: true, screenshotBase64: verifyParsed.base64 })}\n\n`);
                      uiVerification = `\n🔍 تم أخذ screenshot تلقائي للتحقق — راجع الصورة وتأكد أن التغيير "${newText}" ظاهر في الواجهة.`;
                      console.log(`[Agent] AUTO-VERIFY: Screenshot taken after edit of ${editPath}`);
                      await logAudit(agentKey, "auto_verify_screenshot", "screenshot_page", { editPath, newText }, "screenshot_taken", "low", "success");
                    } else {
                      uiVerification = `\n⚠️ لم يتمكن النظام من أخذ screenshot تلقائي. نفّذ screenshot_page يدوياً للتحقق.`;
                      console.log(`[Agent] AUTO-VERIFY FAILED: No screenshot for ${editPath}`);
                    }
                  } catch (verifyErr: any) {
                    uiVerification = `\n⚠️ فشل التحقق البصري التلقائي: ${verifyErr.message || "unknown"}. نفّذ screenshot_page يدوياً.`;
                    console.log(`[Agent] AUTO-VERIFY ERROR: ${verifyErr.message}`);
                  }
                }

                const domSourceLabels: Record<string, string> = { tool: "أداة DOM", search: "بحث نصي", user_input: "معلومات المستخدم", forced_override: "تجاوز تلقائي" };
                const domNote = hasDOMInspection
                  ? `\n📍 مصدر الحقيقة: ${domSourceLabels[domSource] || domSource} ✓`
                  : ``;
                const deployHint = `\n\n🚀 الخطوة التالية: نفّذ git_push مع message يصف التغيير لنشره على mrcodeai.com. التعديل في dev فقط لا يكفي!`;
                finalContent = `✅ EDIT_SUCCESS: تم التعديل بنجاح!\n📁 الملف: ${editPath}\n🔄 matchesReplaced: ${matchesReplaced}\n📝 قبل: "${oldText}"\n📝 بعد: "${newText}"${domNote}${uiVerification}${deployHint}\n\n${result}`;
                console.log(`[Agent] EDIT SUCCESS: matchesReplaced=${matchesReplaced} in ${editPath} | before="${oldText}" → after="${newText}" | domInspected=${hasDOMInspection} | domSource=${domSource} | domBlocks=${domBlockCount}`);
                await logAudit(agentKey, "edit_success", tool.name, { path: editPath, oldText, newText, matchesReplaced, domInspected: hasDOMInspection, domSource, domBlockCount }, result?.slice(0, 500), "medium", "success", durationMs);
              }
            } else if (tool.name === "write_file" && parsedResult) {
              const writePath = parsedResult.path || (tool.input as any)?.path || "";
              if (parsedResult.success === false) {
                finalContent = `⚠️ WRITE_FAILED: كتابة الملف فشلت! الملف: ${writePath}.\n\n${result}`;
                hasEdited = false;
                console.log(`[Agent] WRITE FAILED: ${writePath}`);
                await logAudit(agentKey, "write_failed", tool.name, tool.input, { path: writePath }, "medium", "failed", durationMs);
              } else {
                const isUIWrite = /\.(tsx|jsx|css|html|vue|svelte)$/i.test(writePath);
                let writeVerification = "";
                if (isUIWrite) {
                  try {
                    const wVerify = await executeInfraTool("screenshot_page", { path: "/" }, "admin");
                    let wParsed: any = null;
                    try { wParsed = JSON.parse(wVerify); } catch {}
                    if (wParsed?.base64) {
                      res.write(`data: ${JSON.stringify({ type: "tool_result", name: "auto_verify_screenshot", result: "تم أخذ صورة للتحقق البصري", hasScreenshot: true, screenshotBase64: wParsed.base64 })}\n\n`);
                      writeVerification = `\n🔍 تم أخذ screenshot تلقائي — تحقق من ظهور التغيير.`;
                      console.log(`[Agent] AUTO-VERIFY: Screenshot after write ${writePath}`);
                    }
                  } catch {}
                }
                const writeDeployHint = `\n\n🚀 الخطوة التالية: نفّذ git_push مع message يصف التغيير لنشره على mrcodeai.com.`;
                finalContent = `✅ WRITE_SUCCESS: تم كتابة الملف بنجاح!\n📁 الملف: ${writePath}\n📏 الحجم: ${parsedResult.size || parsedResult.newSize || "unknown"}${writeVerification}${writeDeployHint}\n\n${result}`;
                console.log(`[Agent] WRITE SUCCESS: ${writePath}`);
                await logAudit(agentKey, "write_success", tool.name, { path: writePath }, result?.slice(0, 500), "medium", "success", durationMs);
              }
            } else if (tool.name === "run_sql" && parsedResult && parsedResult.success === false) {
              finalContent = `⚠️ IMPORTANT: هذه العملية فشلت. يجب أن تُبلغ المستخدم بالفشل. ممنوع قول "تم بنجاح".\n\n${result}`;
              await logAudit(agentKey, "db_write_failed", tool.name, tool.input, result?.slice(0, 1000), "high", "failed", durationMs);
            } else if (tool.name === "search_text" && parsedResult) {
              const found = parsedResult.found;
              const matchCount = parsedResult.matchCount || 0;
              const results = parsedResult.results || [];
              const seen = new Set<string>();
              const topFiles: string[] = [];
              for (const r of results) {
                const filePath = (r as string).split(":")[0] || r;
                if (!seen.has(filePath)) {
                  seen.add(filePath);
                  topFiles.push(filePath);
                }
                if (topFiles.length >= 3) break;
              }
              const matchedVariant = parsedResult.matchedVariant || "";
              const variantNote = parsedResult.note || "";
              console.log(`[Agent] Search results: found=${found}, matchCount=${matchCount}, matchedVariant="${matchedVariant}", topFiles=${JSON.stringify(topFiles)}`);
              if (found && topFiles.length > 0) {
                hasReadAfterSearch = false;
                const safeFiles = ["i18n.tsx", "index.css", "App.tsx", "main.tsx", "index.tsx", "layout.tsx"];
                const fileNotes = topFiles.map(f => {
                  const isSafe = safeFiles.some(sf => f.endsWith(sf));
                  const isUI = /\.(tsx|jsx|css|html|vue|svelte)$/i.test(f);
                  let note = isUI ? "📄 واجهة" : "📋 خلفية";
                  if (isSafe) note += " ✅ (مستخدم دائماً)";
                  return `  ${f} — ${note}`;
                }).join("\n");
                const variantHint = matchedVariant && matchedVariant !== (tool.input as any)?.text
                  ? `\n\n⚠️ هام: النص وُجد بالشكل "${matchedVariant}" — استخدم هذا الشكل بالضبط في old_text عند edit_component!`
                  : "";
                finalContent = `${result}\n\n💡 ملفات مرشحة (أفضل 3 بدون تكرار):\n${fileNotes}${variantHint}\n\n⚠️ تأكد أن الملف المختار مستورد (import) في صفحة أو layout قبل التعديل.\nالأولوية: (1) exact match (2) ملف واجهة tsx/jsx مستورد (3) اسم يدل على المكان.\nثم نفّذ read_file على الملف المختار.`;
              }
            }

            if (tool.name === "git_push" && parsedResult?.success) {
              const bTag = parsedResult.backupTag || "unknown";
              finalContent = `${result}\n\n✅ تم الدفع لـ GitHub بنجاح! CI/CD يعمل الآن.\n🏷️ Backup tag: ${bTag}\n⏳ النشر على mrcodeai.com يستغرق ~3 دقائق.\n💡 نفّذ deploy_status للتحقق، ثم verify_production مع النص المتوقع للتأكد من ظهوره.`;
              console.log(`[Agent] GIT_PUSH SUCCESS — backup: ${bTag}`);
              await logAudit(agentKey, "git_push_success", tool.name, { ...tool.input, backupTag: bTag }, result?.slice(0, 500), "high", "success", durationMs);
            } else if (tool.name === "git_push" && parsedResult?.success === false) {
              finalContent = `${result}\n\n❌ فشل الدفع لـ GitHub: ${parsedResult.error?.slice(0, 200)}`;
              console.log(`[Agent] GIT_PUSH FAILED: ${parsedResult.error?.slice(0, 200)}`);
              await logAudit(agentKey, "git_push_failed", tool.name, tool.input, parsedResult.error?.slice(0, 500), "high", "failed", durationMs);
            } else if (tool.name === "git_commit" && parsedResult) {
              finalContent = parsedResult.nothingToCommit
                ? `${result}\n\n📝 لا توجد تغييرات جديدة. نفّذ git_push مباشرة.`
                : `${result}\n\n✅ تم حفظ التغييرات محلياً. نفّذ git_push الآن لنشرها.`;
            } else if (tool.name === "verify_production" && parsedResult) {
              if (parsedResult.found) {
                finalContent = `${result}\n\n✅ تم التحقق: النص موجود في الإنتاج (${parsedResult.url}).\nالتعديل ناجح ومنشور!`;
                console.log(`[Agent] VERIFY_PRODUCTION: FOUND at ${parsedResult.url}`);
                await logAudit(agentKey, "verify_production_success", tool.name, tool.input, { found: true, url: parsedResult.url }, "low", "success", durationMs);
              } else {
                finalContent = `${result}\n\n❌ التحقق فشل: النص غير موجود في ${parsedResult.url}.\nالتعديل لم يظهر في الإنتاج بعد. قد يحتاج CI/CD وقتاً إضافياً. جرّب مرة أخرى بعد دقيقتين.`;
                console.log(`[Agent] VERIFY_PRODUCTION: NOT FOUND at ${parsedResult.url}`);
                await logAudit(agentKey, "verify_production_failed", tool.name, tool.input, { found: false, url: parsedResult.url }, "medium", "failed", durationMs);
              }
            } else if (tool.name === "rollback_deploy" && parsedResult) {
              if (parsedResult.success) {
                finalContent = `${result}\n\n✅ تم التراجع والنشر بنجاح. الموقع سيعود للنسخة السابقة خلال ~3 دقائق.`;
                await logAudit(agentKey, "rollback_success", tool.name, tool.input, result?.slice(0, 500), "high", "success", durationMs);
              } else {
                finalContent = `${result}\n\n❌ فشل التراجع: ${parsedResult.error?.slice(0, 200)}`;
                await logAudit(agentKey, "rollback_failed", tool.name, tool.input, parsedResult.error?.slice(0, 500), "high", "failed", durationMs);
              }
            }

            const enrichedTools = ["edit_component", "write_file", "search_text", "run_sql", "git_push", "git_commit", "verify_production", "rollback_deploy"];
            const sseContent = enrichedTools.includes(tool.name) ? finalContent.slice(0, 5000) : result.slice(0, 5000);
            res.write(`data: ${JSON.stringify({ type: "tool_result", name: tool.name, result: sseContent })}\n\n`);
            toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: finalContent });
          }
        }
        chatMsgs.push({ role: "user", content: toolResults });
      }

      console.log(`[Agent] Session complete: toolActions=${toolActionCount}, searchCount=${searchCount}, hasEdited=${hasEdited}, queries=${JSON.stringify(searchQueries)}`);
      await logAudit(agentKey, "session_summary", "system", {
        toolActionCount,
        searchCount,
        hasEdited,
        searchQueries,
      }, { fullReplyLength: fullReply.length }, "low", hasEdited ? "success" : "completed");

    } else if (slot.provider === "google") {
      const { getGoogleClient } = await import("../lib/agents/ai-clients");
      const client = await getGoogleClient();
      const chatMsgs = conversationMessages.map(m => ({
        role: m.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: m.content }],
      }));
      const response = await client.models.generateContentStream({
        model: slot.model,
        contents: chatMsgs,
        config: {
          systemInstruction: infraSystemPrompt,
          maxOutputTokens: slot.maxTokens || 16000,
          temperature: parseFloat(String(config.creativity)) || 0.3,
        },
      });
      for await (const chunk of response as any) {
        const text = chunk.text;
        if (text) {
          fullReply += text;
          res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
        }
      }
      tokensUsed = Math.ceil(fullReply.length / 3);
    } else if (slot.provider === "openai") {
      const { getOpenAIClient } = await import("../lib/agents/ai-clients");
      const client = await getOpenAIClient();
      const msgs: any[] = [
        { role: "system", content: infraSystemPrompt },
        ...conversationMessages.map(m => ({ role: m.role, content: m.content })),
      ];
      const isReasoningModel = slot.model.startsWith("o1") || slot.model.startsWith("o3");
      const stream = await client.chat.completions.create({
        model: slot.model,
        max_completion_tokens: slot.maxTokens || 16000,
        messages: msgs,
        stream: true,
        ...(isReasoningModel ? {} : { temperature: parseFloat(String(config.creativity)) || 0.5 }),
      });
      for await (const chunk of stream as any) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          fullReply += delta;
          res.write(`data: ${JSON.stringify({ type: "chunk", text: delta })}\n\n`);
        }
      }
      tokensUsed = Math.ceil(fullReply.length / 3);
    }

    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: fullReply });
    if (history.length > 40) history.splice(0, history.length - 40);
    infraSessions.set(sKey, history);

    const cost = tokensUsed * 0.000015;
    res.write(`data: ${JSON.stringify({ type: "done", tokensUsed, cost, model: slot.model })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("[Infra Chat Error]", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: { message: err.message } });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
      res.end();
    }
  }
});

router.get("/ai/approvals", requireInfraAdmin, async (_req, res) => {
  try {
    const approvals = await db.select().from(aiApprovalsTable).orderBy(desc(aiApprovalsTable.createdAt)).limit(100);
    res.json({ approvals });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

router.get("/ai/approvals/pending", requireInfraAdmin, async (_req, res) => {
  try {
    const pending = await db.select().from(aiApprovalsTable).where(eq(aiApprovalsTable.status, "pending")).orderBy(desc(aiApprovalsTable.createdAt));
    res.json({ approvals: pending });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

router.post("/ai/approve/:id", requireInfraAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [approval] = await db.select().from(aiApprovalsTable).where(eq(aiApprovalsTable.id, id));
    if (!approval) return res.status(404).json({ error: { message: "طلب غير موجود" } });
    if (approval.status !== "pending") return res.status(400).json({ error: { message: `الطلب ${approval.status} بالفعل` } });

    const result = await executeInfraTool(approval.tool, approval.input as any, "admin");

    await db.update(aiApprovalsTable).set({
      status: "approved",
      decidedBy: (req as any).user?.email || "admin",
      decidedAt: new Date(),
      executionResult: { output: result?.slice(0, 2000) },
    }).where(eq(aiApprovalsTable.id, id));

    await logAudit(approval.agentKey, "approval_executed", approval.tool, approval.input, result?.slice(0, 1000), approval.risk, "approved", undefined, id);
    res.json({ status: "approved", result: result?.slice(0, 5000) });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

router.post("/ai/reject/:id", requireInfraAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [approval] = await db.select().from(aiApprovalsTable).where(eq(aiApprovalsTable.id, id));
    if (!approval) return res.status(404).json({ error: { message: "طلب غير موجود" } });
    if (approval.status !== "pending") return res.status(400).json({ error: { message: `الطلب ${approval.status} بالفعل` } });

    await db.update(aiApprovalsTable).set({
      status: "rejected",
      decidedBy: (req as any).user?.email || "admin",
      decidedAt: new Date(),
    }).where(eq(aiApprovalsTable.id, id));

    await logAudit(approval.agentKey, "approval_rejected", approval.tool, approval.input, "rejected by admin", approval.risk, "rejected", undefined, id);
    res.json({ status: "rejected" });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

router.get("/ai/audit-logs", requireInfraAdmin, async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit)) || 100;
    const logs = await db.select().from(aiAuditLogsTable).orderBy(desc(aiAuditLogsTable.createdAt)).limit(limit);
    res.json({ logs });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

router.get("/qa/last-result", requireInfraAdmin, async (_req, res) => {
  try {
    const logs = await db.select().from(aiAuditLogsTable)
      .where(eq(aiAuditLogsTable.tool, "qa_gate"))
      .orderBy(desc(aiAuditLogsTable.createdAt))
      .limit(1);
    if (logs.length === 0) {
      res.json({ status: "NO_RESULTS", message: "لم يتم إجراء فحص QA بعد", qaResults: [], checkedAt: null });
      return;
    }
    const last = logs[0];
    const result = last.result as any;
    res.json({
      status: result?.status || last.status,
      qaResults: result?.qaResults || [],
      checkedAt: last.createdAt,
      agentKey: last.agentKey,
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

router.get("/ai/kill-switch", requireInfraAdmin, async (_req, res) => {
  res.json({ enabled: getInfraAccessEnabled() });
});

router.post("/ai/kill-switch", requireInfraAdmin, async (req, res) => {
  const { enabled } = req.body;
  await setInfraAccessEnabled(!!enabled);
  await logAudit("system", enabled ? "kill_switch_off" : "kill_switch_on", "system", { enabled }, null, "critical", "success");
  res.json({ enabled: getInfraAccessEnabled() });
});

router.post("/infra/director-stream", requireInfraAdmin, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { message } = req.body as { message: string };

    if (!message?.trim()) {
      res.status(400).json({ error: { message: "Message is required" } });
      return;
    }

    const [config] = await db.select().from(agentConfigsTable)
      .where(and(eq(agentConfigsTable.agentKey, "infra_sysadmin"), eq(agentConfigsTable.agentLayer, "infra")))
      .limit(1);

    if (!config || !config.enabled) {
      res.status(404).json({ error: { message: "System Director not found or disabled" } });
      return;
    }

    const blueprint = getSystemBlueprint();

    const allAgents = await db.select({
      agentKey: agentConfigsTable.agentKey,
      displayNameAr: agentConfigsTable.displayNameAr,
      displayNameEn: agentConfigsTable.displayNameEn,
      enabled: agentConfigsTable.enabled,
      description: agentConfigsTable.description,
      agentLayer: agentConfigsTable.agentLayer,
    }).from(agentConfigsTable);

    const agentStatusReport = allAgents.map(a =>
      `- ${a.displayNameAr} (${a.agentKey}) [${a.agentLayer}] — ${a.enabled ? "✅ فعّال" : "❌ معطّل"} — ${a.description}`
    ).join("\n");

    const directorPrompt = `أنت مدير النظام (${config.displayNameAr} / ${config.displayNameEn}) — القائد الأعلى لمنصة Mr Code AI.

${config.description}

أنت تعمل بنظام Governor — ثلاثة نماذج ذكاء اصطناعي تحلل طلبك بالتوازي، ثم الحاكم يدمج أفضل النتائج في رد واحد نهائي دقيق جداً.

${blueprint}

## حالة الوكلاء الحالية:
${agentStatusReport}

## القواعد:
- رد بالعربية إذا المالك يتحدث بالعربية، وبالإنجليزية إذا يتحدث بالإنجليزية
- كن حازماً ومباشراً — أنت المدير مو المساعد
- ابدأ بملخص سريع للوضع ثم التفاصيل
- اذكر أسماء الملفات والمسارات بدقة
- إذا تحتاج تعديل كود، اعرض التعديل الجراحي (قبل/بعد) مع المسار ورقم السطر
- لا تخترع ملفات — اعتمد على خريطة النظام
- اقترح دائماً الخطوة التالية

${config.instructions || ""}
${config.permissions && Array.isArray(config.permissions) && config.permissions.length > 0 ? `\nصلاحياتك: ${config.permissions.join(", ")}` : ""}`;

    const sKey = `infra_${userId}_infra_sysadmin`;
    const history = infraSessions.get(sKey) || [];

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const conversationMessages = [
      ...history.slice(-20),
      { role: "user" as const, content: message },
    ];

    const slots: Array<{ provider: string; model: string; maxTokens: number; timeoutSeconds: number }> = [];
    const primary = config.primaryModel;
    if (primary?.enabled) slots.push({ provider: primary.provider, model: primary.model, maxTokens: primary.maxTokens || 64000, timeoutSeconds: primary.timeoutSeconds || 300 });
    const secondary = config.secondaryModel as any;
    if (secondary?.enabled) slots.push({ provider: secondary.provider, model: secondary.model, maxTokens: secondary.maxTokens || 32000, timeoutSeconds: secondary.timeoutSeconds || 120 });
    const tertiary = config.tertiaryModel as any;
    if (tertiary?.enabled) slots.push({ provider: tertiary.provider, model: tertiary.model, maxTokens: tertiary.maxTokens || 32000, timeoutSeconds: tertiary.timeoutSeconds || 180 });

    if (slots.length === 0) slots.push({ provider: "anthropic", model: "claude-sonnet-4-6", maxTokens: 64000, timeoutSeconds: 300 });

    res.write(`data: ${JSON.stringify({ type: "status", message: `تشغيل ${slots.length} نموذج ذكاء اصطناعي بالتوازي...`, messageEn: `Running ${slots.length} AI models in parallel...` })}\n\n`);

    const callModel = async (provider: string, model: string, maxTokens: number, timeoutSec: number): Promise<{ content: string; tokensUsed: number; model: string; durationMs: number } | null> => {
      const start = Date.now();
      try {
        if (provider === "anthropic") {
          const { getAnthropicClient } = await import("../lib/agents/ai-clients");
          const client = await getAnthropicClient();
          const chatMsgs = conversationMessages
            .filter(m => m.role !== "system")
            .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
          const stream = client.messages.stream({
            model, max_tokens: Math.min(maxTokens, 64000), system: directorPrompt,
            messages: chatMsgs,
            temperature: Math.min(parseFloat(String(config.creativity)) || 0.5, 1.0),
          });
          const response = await stream.finalMessage();
          const text = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
          const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
          return { content: text, tokensUsed: tokens, model, durationMs: Date.now() - start };
        } else if (provider === "google") {
          const { getGoogleClient } = await import("../lib/agents/ai-clients");
          const client = await getGoogleClient();
          const chatMsgs = conversationMessages.map(m => ({
            role: m.role === "assistant" ? "model" as const : "user" as const,
            parts: [{ text: m.content }],
          }));
          const response = await client.models.generateContent({
            model, contents: chatMsgs,
            config: { systemInstruction: directorPrompt, maxOutputTokens: maxTokens, temperature: parseFloat(String(config.creativity)) || 0.3 },
          });
          const text = response.text || "";
          return { content: text, tokensUsed: Math.ceil(text.length / 3), model, durationMs: Date.now() - start };
        } else if (provider === "openai") {
          const { getOpenAIClient } = await import("../lib/agents/ai-clients");
          const client = await getOpenAIClient();
          const msgs: any[] = [
            { role: "system", content: directorPrompt },
            ...conversationMessages.map(m => ({ role: m.role, content: m.content })),
          ];
          const isReasoningModel = model.startsWith("o1") || model.startsWith("o3");
          const response = await client.chat.completions.create({
            model, max_completion_tokens: maxTokens, messages: msgs,
            ...(isReasoningModel ? {} : { temperature: parseFloat(String(config.creativity)) || 0.5 }),
          });
          const text = response.choices[0]?.message?.content || "";
          const tokens = (response.usage?.total_tokens ?? 0) || Math.ceil(text.length / 3);
          return { content: text, tokensUsed: tokens, model, durationMs: Date.now() - start };
        }
        return null;
      } catch (err: any) {
        console.error(`[Director] Model ${model} failed:`, err.message);
        return null;
      }
    };

    const thinkResults = await Promise.allSettled(
      slots.map(slot => {
        res.write(`data: ${JSON.stringify({ type: "status", message: `${slot.model} يحلل...`, messageEn: `${slot.model} analyzing...` })}\n\n`);
        return callModel(slot.provider, slot.model, slot.maxTokens, slot.timeoutSeconds);
      })
    );

    const successResults: Array<{ content: string; tokensUsed: number; model: string; durationMs: number }> = [];
    for (const r of thinkResults) {
      if (r.status === "fulfilled" && r.value) successResults.push(r.value);
    }

    if (successResults.length === 0) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "All models failed" })}\n\n`);
      res.end();
      return;
    }

    let finalContent = "";
    let totalTokens = successResults.reduce((sum, r) => sum + r.tokensUsed, 0);
    const modelsUsed = successResults.map(r => r.model);

    if (successResults.length === 1) {
      finalContent = successResults[0].content;
      res.write(`data: ${JSON.stringify({ type: "status", message: `نموذج واحد أجاب: ${successResults[0].model}`, messageEn: `Single model responded: ${successResults[0].model}` })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: "status", message: `الحاكم يدمج ${successResults.length} تحليلات...`, messageEn: `Governor merging ${successResults.length} analyses...` })}\n\n`);

      const proposalsText = successResults.map((r, i) =>
        `=== تحليل ${i + 1} (من ${r.model}, ${r.durationMs}ms) ===\n${r.content}`
      ).join("\n\n");

      const governorPrompt = `أنت الحاكم (Governor) — المقيّم النهائي. استلمت تحليلات من ${successResults.length} نماذج ذكاء اصطناعي درسوا نفس الطلب.

مهمتك:
1. قيّم كل تحليل من حيث الصحة والعمق والعملية
2. حدد أفضل تشخيص وحل من كل المقترحات
3. ادمج أقوى العناصر في رد واحد نهائي موحّد
4. إذا التحليلات تختلف، اختر الأصح تقنياً
5. رد بنفس لغة المستخدم الأصلية (عربي أو إنجليزي)
6. النتيجة النهائية يجب تكون واضحة ومحددة وقابلة للتنفيذ

لا تذكر إنك حاكم أو إنك تدمج — قدّم الإجابة كأنها من مدير النظام مباشرة.`;

      const govModelConfig = config.governorModel as any;
      const govProvider = govModelConfig?.provider ?? "anthropic";
      const govModel = govModelConfig?.model ?? "claude-sonnet-4-6";
      const govMaxTokens = govModelConfig?.maxTokens ?? 64000;

      const mergePromptMsgs = [
        ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: `الطلب الأصلي من المالك: "${message}"\n\n${proposalsText}\n\nادمج أفضل النتائج في رد نهائي واحد:` },
      ];

      try {
        if (govProvider === "anthropic") {
          const { getAnthropicClient } = await import("../lib/agents/ai-clients");
          const client = await getAnthropicClient();
          const chatMsgs = mergePromptMsgs
            .filter(m => m.role !== "system")
            .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
          let govReply = "";
          const govStream = client.messages.stream({
            model: govModel,
            max_tokens: Math.min(govMaxTokens, 64000),
            system: governorPrompt,
            messages: chatMsgs,
            temperature: 0.3,
          });
          govStream.on("text", (text: string) => {
            govReply += text;
            res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
          });
          const govResponse = await govStream.finalMessage();
          totalTokens += (govResponse.usage?.input_tokens ?? 0) + (govResponse.usage?.output_tokens ?? 0);
          finalContent = govReply;
          modelsUsed.push(`governor:${govModel}`);
        } else if (govProvider === "google") {
          const { getGoogleClient } = await import("../lib/agents/ai-clients");
          const client = await getGoogleClient();
          const chatMsgs = mergePromptMsgs.map(m => ({
            role: m.role === "assistant" ? "model" as const : "user" as const,
            parts: [{ text: m.content }],
          }));
          const response = await client.models.generateContentStream({
            model: govModel, contents: chatMsgs,
            config: { systemInstruction: governorPrompt, maxOutputTokens: govMaxTokens, temperature: 0.3 },
          });
          let govReply = "";
          for await (const chunk of response as any) {
            const text = chunk.text;
            if (text) {
              govReply += text;
              res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
            }
          }
          totalTokens += Math.ceil(govReply.length / 3);
          finalContent = govReply;
          modelsUsed.push(`governor:${govModel}`);
        } else if (govProvider === "openai") {
          const { getOpenAIClient } = await import("../lib/agents/ai-clients");
          const client = await getOpenAIClient();
          const msgs: any[] = [
            { role: "system", content: governorPrompt },
            ...mergePromptMsgs.map(m => ({ role: m.role, content: m.content })),
          ];
          const isReasoning = govModel.startsWith("o1") || govModel.startsWith("o3");
          const stream = await client.chat.completions.create({
            model: govModel, messages: msgs, stream: true,
            ...(isReasoning ? {} : { temperature: 0.3 }),
          });
          let govReply = "";
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              govReply += text;
              res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
            }
          }
          totalTokens += Math.ceil(govReply.length / 3);
          finalContent = govReply;
          modelsUsed.push(`governor:${govModel}`);
        }
      } catch (govErr: any) {
        console.error("[Governor Error]", govErr.message);
        finalContent = successResults[0].content;
        for (const char of finalContent) {
          res.write(`data: ${JSON.stringify({ type: "chunk", text: char })}\n\n`);
        }
      }
    }

    if (successResults.length === 1) {
      for (let i = 0; i < finalContent.length; i += 3) {
        const chunk = finalContent.slice(i, i + 3);
        res.write(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`);
      }
    }

    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: finalContent });
    if (history.length > 40) history.splice(0, history.length - 40);
    infraSessions.set(sKey, history);

    const cost = totalTokens * 0.000015;
    res.write(`data: ${JSON.stringify({ type: "done", tokensUsed: totalTokens, cost, models: modelsUsed })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("[Director Error]", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: { message: err.message } });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
      res.end();
    }
  }
});

router.post("/infra/clear-session", requireInfraAdmin, async (req, res) => {
  const userId = req.user!.id;
  const { agentKey } = req.body;
  const sKey = `infra_${userId}_${agentKey}`;
  infraSessions.delete(sKey);
  res.json({ success: true });
});

router.post("/infra/reset/:agentKey", requireInfraAdmin, async (req, res) => {
  try {
    const { agentKey } = req.params;
    const defaultAgent = DEFAULT_INFRA_AGENTS.find(a => a.agentKey === agentKey);
    if (!defaultAgent) {
      res.status(404).json({ error: { message: "No default config for this infra agent", messageAr: "لا توجد إعدادات افتراضية لهذا الوكيل" } });
      return;
    }

    const [updated] = await db.update(agentConfigsTable)
      .set({
        displayNameEn: defaultAgent.displayNameEn,
        displayNameAr: defaultAgent.displayNameAr,
        description: defaultAgent.description,
        enabled: true,
        isCustom: false,
        governorEnabled: defaultAgent.governorEnabled,
        autoGovernor: defaultAgent.autoGovernor,
        governorModel: defaultAgent.governorModel,
        primaryModel: defaultAgent.primaryModel,
        secondaryModel: defaultAgent.secondaryModel,
        tertiaryModel: defaultAgent.tertiaryModel,
        systemPrompt: defaultAgent.systemPrompt,
        instructions: defaultAgent.instructions,
        permissions: defaultAgent.permissions,
        pipelineOrder: defaultAgent.pipelineOrder,
        receivesFrom: defaultAgent.receivesFrom,
        sendsTo: defaultAgent.sendsTo,
        roleOnReceive: defaultAgent.roleOnReceive,
        roleOnSend: defaultAgent.roleOnSend,
        tokenLimit: defaultAgent.tokenLimit,
        batchSize: defaultAgent.batchSize,
        creativity: defaultAgent.creativity,
        sourceFiles: defaultAgent.sourceFiles,
        shortTermMemory: [],
        longTermMemory: [],
        updatedAt: new Date(),
      })
      .where(eq(agentConfigsTable.agentKey, agentKey))
      .returning();

    if (!updated) {
      res.status(404).json({ error: { message: "Agent not found" } });
      return;
    }
    res.json(updated);
  } catch (error) {
    console.error("Failed to reset infra agent:", error);
    res.status(500).json({ error: { message: "Failed to reset agent config" } });
  }
});

router.post("/infra/reset-all", requireInfraAdmin, async (_req, res) => {
  try {
    const results = [];
    for (const defaultAgent of DEFAULT_INFRA_AGENTS) {
      const [updated] = await db.update(agentConfigsTable)
        .set({
          displayNameEn: defaultAgent.displayNameEn,
          displayNameAr: defaultAgent.displayNameAr,
          description: defaultAgent.description,
          enabled: true,
          isCustom: false,
          governorEnabled: defaultAgent.governorEnabled,
          autoGovernor: defaultAgent.autoGovernor,
          governorModel: defaultAgent.governorModel,
          primaryModel: defaultAgent.primaryModel,
          secondaryModel: defaultAgent.secondaryModel,
          tertiaryModel: defaultAgent.tertiaryModel,
          systemPrompt: defaultAgent.systemPrompt,
          instructions: defaultAgent.instructions,
          permissions: defaultAgent.permissions,
          pipelineOrder: defaultAgent.pipelineOrder,
          receivesFrom: defaultAgent.receivesFrom,
          sendsTo: defaultAgent.sendsTo,
          roleOnReceive: defaultAgent.roleOnReceive,
          roleOnSend: defaultAgent.roleOnSend,
          tokenLimit: defaultAgent.tokenLimit,
          batchSize: defaultAgent.batchSize,
          creativity: defaultAgent.creativity,
          sourceFiles: defaultAgent.sourceFiles,
          shortTermMemory: [],
          longTermMemory: [],
          updatedAt: new Date(),
        })
        .where(eq(agentConfigsTable.agentKey, defaultAgent.agentKey))
        .returning();
      if (updated) results.push(updated);
    }
    res.json({ success: true, count: results.length, agents: results });
  } catch (error) {
    console.error("Failed to reset all infra agents:", error);
    res.status(500).json({ error: { message: "Failed to reset all agents" } });
  }
});

router.get("/infra/defaults/:agentKey", requireInfraAdmin, (req, res) => {
  const { agentKey } = req.params;
  const defaultAgent = DEFAULT_INFRA_AGENTS.find(a => a.agentKey === agentKey);
  if (!defaultAgent) {
    res.status(404).json({ error: { message: "No defaults for this agent" } });
    return;
  }
  res.json(defaultAgent);
});

function getWorkspaceRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml")) || fs.existsSync(path.join(dir, "artifacts"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", ".cache", ".turbo", ".output",
  ".nuxt", ".next", ".svelte-kit", "__pycache__", ".DS_Store",
  ".local", ".config", "attached_assets", ".upm",
]);

const IGNORE_FILES = new Set([
  ".DS_Store", "Thumbs.db", ".npmrc",
]);

function scanDir(dirPath: string, depth: number = 0, maxDepth: number = 4): FileNode[] {
  if (depth > maxDepth) return [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result: FileNode[] = [];
    const folders: FileNode[] = [];
    const files: FileNode[] = [];

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || IGNORE_FILES.has(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".agents" && entry.name !== ".github" && entry.name !== ".dockerignore" && entry.name !== ".gitignore" && entry.name !== ".gitattributes") continue;

      if (entry.isDirectory()) {
        const children = scanDir(path.join(dirPath, entry.name), depth + 1, maxDepth);
        folders.push({ name: entry.name, type: "folder", children });
      } else {
        files.push({ name: entry.name, type: "file" });
      }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    return [...folders, ...files];
  } catch {
    return [];
  }
}

router.get("/infra/files", requireInfraAdmin, (_req, res) => {
  const root = getWorkspaceRoot();
  const tree = scanDir(root);
  res.json({ root: path.basename(root), tree });
});

router.get("/infra/file-content", requireInfraAdmin, (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    return res.status(400).json({ error: { message: "path query param required" } });
  }
  const root = getWorkspaceRoot();
  const fullPath = path.resolve(root, filePath);
  if (!fullPath.startsWith(root)) {
    return res.status(403).json({ error: { message: "Access denied" } });
  }
  try {
    const stat = fs.statSync(fullPath);
    if (stat.size > 500_000) {
      return res.status(413).json({ error: { message: "File too large" } });
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    res.json({ path: filePath, content, size: stat.size });
  } catch {
    res.status(404).json({ error: { message: "File not found" } });
  }
});

router.post("/infra/file-rename", requireInfraAdmin, (req, res) => {
  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) return res.status(400).json({ error: { message: "oldPath and newName required" } });
  const root = getWorkspaceRoot();
  const fullOld = path.resolve(root, oldPath);
  if (!fullOld.startsWith(root)) return res.status(403).json({ error: { message: "Access denied" } });
  const newPath = path.join(path.dirname(fullOld), newName);
  if (!newPath.startsWith(root)) return res.status(403).json({ error: { message: "Access denied" } });
  try {
    fs.renameSync(fullOld, newPath);
    res.json({ success: true, oldPath, newPath: path.relative(root, newPath) });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post("/infra/file-create", requireInfraAdmin, (req, res) => {
  const { parentPath, name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: { message: "name and type required" } });
  const root = getWorkspaceRoot();
  const parent = parentPath ? path.resolve(root, parentPath) : root;
  if (!parent.startsWith(root)) return res.status(403).json({ error: { message: "Access denied" } });
  const fullPath = path.join(parent, name);
  if (!fullPath.startsWith(root)) return res.status(403).json({ error: { message: "Access denied" } });
  try {
    if (type === "folder") {
      fs.mkdirSync(fullPath, { recursive: true });
    } else {
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, "", "utf-8");
    }
    res.json({ success: true, path: path.relative(root, fullPath), type });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.delete("/infra/file-delete", requireInfraAdmin, (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: { message: "path required" } });
  const root = getWorkspaceRoot();
  const fullPath = path.resolve(root, filePath);
  if (!fullPath.startsWith(root)) return res.status(403).json({ error: { message: "Access denied" } });
  if (fullPath === root) return res.status(403).json({ error: { message: "Cannot delete root" } });
  try {
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    res.json({ success: true, deleted: filePath });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.put("/infra/file-content", requireInfraAdmin, (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || typeof content !== "string") {
    return res.status(400).json({ error: { message: "path and content required" } });
  }
  const root = getWorkspaceRoot();
  const fullPath = path.resolve(root, filePath);
  if (!fullPath.startsWith(root)) {
    return res.status(403).json({ error: { message: "Access denied" } });
  }
  try {
    fs.writeFileSync(fullPath, content, "utf-8");
    res.json({ success: true, path: filePath, size: Buffer.byteLength(content, "utf-8") });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || "Failed to save file" } });
  }
});

router.post("/infra/deploy-production", requireInfraAdmin, async (req, res) => {
  try {
    const ghToken = await (async () => {
      if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
      try {
        const connectorHostname = process.env.REPLIT_CONNECTORS_HOSTNAME || process.env.CONNECTORS_HOSTNAME;
        if (connectorHostname) {
          const r = await fetch(`http://${connectorHostname}/proxy/github`);
          if (r.ok) { const d = await r.json(); if (d?.access_token) return d.access_token; }
        }
      } catch {}
      try {
        const { execSync: ex } = require("child_process");
        const token = ex("git remote get-url github 2>/dev/null || git remote get-url origin 2>/dev/null", { encoding: "utf-8" }).trim();
        const match = token.match(/https:\/\/([^@]+)@github\.com/);
        if (match && match[1] && match[1].length > 10) return match[1];
      } catch {}
      return null;
    })();
    if (!ghToken) return res.status(500).json({ error: "GitHub token not available" });

    const repo = process.env.GITHUB_REPOSITORY || "jml965/ai-platform";
    const wfRes = await fetch(`https://api.github.com/repos/${repo}/actions/workflows`, {
      headers: { Authorization: `token ${ghToken}`, Accept: "application/vnd.github.v3+json" },
    });
    const workflows = await wfRes.json();
    const prodWf = workflows.workflows?.find((w: any) =>
      w.name?.toLowerCase().includes("production") || w.path?.includes("deploy-cloud-run")
    );
    if (!prodWf) return res.status(404).json({ error: "Production workflow not found" });

    const triggerRes = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${prodWf.id}/dispatches`, {
      method: "POST",
      headers: { Authorization: `token ${ghToken}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main" }),
    });
    if (triggerRes.status === 204) {
      return res.json({ success: true, message: "Production deployment triggered", workflow: prodWf.name });
    }
    const errBody = await triggerRes.text();
    res.status(triggerRes.status).json({ error: errBody });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/infra/deploy-status", requireInfraAdmin, async (req, res) => {
  try {
    const ghToken = await (async () => {
      if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
      try {
        const connectorHostname = process.env.REPLIT_CONNECTORS_HOSTNAME || process.env.CONNECTORS_HOSTNAME;
        if (connectorHostname) {
          const r = await fetch(`http://${connectorHostname}/proxy/github`);
          if (r.ok) { const d = await r.json(); if (d?.access_token) return d.access_token; }
        }
      } catch {}
      try {
        const { execSync: ex } = require("child_process");
        const token = ex("git remote get-url github 2>/dev/null || git remote get-url origin 2>/dev/null", { encoding: "utf-8" }).trim();
        const match = token.match(/https:\/\/([^@]+)@github\.com/);
        if (match && match[1] && match[1].length > 10) return match[1];
      } catch {}
      return null;
    })();
    if (!ghToken) return res.status(500).json({ error: "GitHub token not available" });

    const repo = process.env.GITHUB_REPOSITORY || "jml965/ai-platform";
    const runsRes = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=5`, {
      headers: { Authorization: `token ${ghToken}`, Accept: "application/vnd.github.v3+json" },
    });
    const data = await runsRes.json();
    const runs = (data.workflow_runs || []).map((r: any) => ({
      id: r.id, name: r.name, status: r.status, conclusion: r.conclusion,
      created: r.created_at, url: r.html_url,
    }));
    res.json({ runs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// T002: Approval API Endpoints
// ═══════════════════════════════════════

router.get("/infra/approvals", requireInfraAdmin, async (_req, res) => {
  try {
    const approvals = await db.select().from(aiApprovalsTable)
      .orderBy(desc(aiApprovalsTable.createdAt))
      .limit(50);
    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/infra/approvals/pending", requireInfraAdmin, async (_req, res) => {
  try {
    const pending = await db.select().from(aiApprovalsTable)
      .where(eq(aiApprovalsTable.status, "pending"))
      .orderBy(desc(aiApprovalsTable.createdAt));
    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/infra/approvals/:id/approve", requireInfraAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [approval] = await db.select().from(aiApprovalsTable).where(eq(aiApprovalsTable.id, id)).limit(1);
    if (!approval) return res.status(404).json({ error: "طلب الموافقة غير موجود" });
    if (approval.status !== "pending") return res.status(400).json({ error: `الطلب ${approval.status} بالفعل` });

    await db.update(aiApprovalsTable).set({
      status: "approved",
      decidedBy: req.user?.id || "admin",
      decidedAt: new Date(),
    }).where(eq(aiApprovalsTable.id, id));

    let executionResult: any = null;
    try {
      const result = await executeInfraTool(approval.tool, approval.input as any, "admin");
      executionResult = { success: true, output: result?.slice(0, 2000) };
    } catch (execErr: any) {
      executionResult = { success: false, error: execErr.message?.slice(0, 500) };
    }

    await db.update(aiApprovalsTable).set({ executionResult }).where(eq(aiApprovalsTable.id, id));
    await logAudit(approval.agentKey, "approval_executed", approval.tool, approval.input, executionResult, approval.risk, executionResult?.success ? "success" : "failed", undefined, id);

    console.log(`[Approval] ✅ Approved & executed: ${approval.tool} by ${req.user?.id}`);
    res.json({ success: true, approval: { ...approval, status: "approved" }, executionResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/infra/approvals/:id/reject", requireInfraAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const [approval] = await db.select().from(aiApprovalsTable).where(eq(aiApprovalsTable.id, id)).limit(1);
    if (!approval) return res.status(404).json({ error: "طلب الموافقة غير موجود" });
    if (approval.status !== "pending") return res.status(400).json({ error: `الطلب ${approval.status} بالفعل` });

    await db.update(aiApprovalsTable).set({
      status: "rejected",
      decidedBy: req.user?.id || "admin",
      decidedAt: new Date(),
      executionResult: { rejected: true, reason: reason || "رفض يدوي" },
    }).where(eq(aiApprovalsTable.id, id));

    await logAudit(approval.agentKey, "approval_rejected", approval.tool, approval.input, { rejected: true, reason }, approval.risk, "rejected", undefined, id);

    console.log(`[Approval] ❌ Rejected: ${approval.tool} by ${req.user?.id}, reason: ${reason || "none"}`);
    res.json({ success: true, approval: { ...approval, status: "rejected" } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// T004: Kill Switch DB Persistence
// ═══════════════════════════════════════

router.post("/infra/kill-switch", requireInfraAdmin, async (req, res) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled must be boolean" });

    await setInfraAccessEnabled(enabled);
    await db.insert(aiSystemSettingsTable).values({ key: "infra_access_enabled", value: enabled, updatedAt: new Date() })
      .onConflictDoUpdate({ target: aiSystemSettingsTable.key, set: { value: enabled, updatedAt: new Date() } });

    await logAudit("system", enabled ? "kill_switch_off" : "kill_switch_on", "system", { enabled }, null, "critical", "success");
    console.log(`[KillSwitch] Infrastructure access ${enabled ? "ENABLED" : "DISABLED (KILLED)"}`);
    res.json({ enabled, message: enabled ? "✅ البنية التحتية مفعّلة" : "🔴 تم إيقاف جميع العمليات — Kill Switch مفعّل" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/infra/kill-switch", requireInfraAdmin, async (_req, res) => {
  try {
    const [setting] = await db.select().from(aiSystemSettingsTable)
      .where(eq(aiSystemSettingsTable.key, "infra_access_enabled")).limit(1);
    const enabled = setting ? setting.value === true : getInfraAccessEnabled();
    res.json({ enabled });
  } catch (err: any) {
    res.json({ enabled: getInfraAccessEnabled() });
  }
});

// ═══════════════════════════════════════
// Audit Logs API
// ═══════════════════════════════════════

router.get("/infra/audit-logs", requireInfraAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const tool = req.query.tool as string;
    const status = req.query.status as string;

    let query = db.select().from(aiAuditLogsTable).orderBy(desc(aiAuditLogsTable.createdAt)).limit(limit);
    if (tool) query = query.where(eq(aiAuditLogsTable.tool, tool)) as any;
    if (status) query = query.where(eq(aiAuditLogsTable.status, status)) as any;

    const logs = await query;
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/infra/audit-logs/stats", requireInfraAdmin, async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'success') as success_count,
        COUNT(*) FILTER (WHERE status = 'blocked') as blocked_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(DISTINCT tool) as unique_tools,
        COUNT(DISTINCT agent_key) as unique_agents
      FROM ai_audit_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    const rows = (result as any).rows || (Array.isArray(result) ? result : [result]);
    res.json(rows[0] || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
