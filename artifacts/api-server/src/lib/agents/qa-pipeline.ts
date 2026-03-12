import { db } from "@workspace/db";
import {
  qaReportsTable,
  projectFilesTable,
  executionLogsTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { FixerAgent } from "./fixer-agent";
import { FileManagerAgent } from "./filemanager-agent";
import { getConstitution } from "./constitution";
import type { GeneratedFile, CodeIssue, BuildContext } from "./types";

export interface QaCheckResult {
  status: "passed" | "failed" | "warning";
  score: number;
  details: {
    checks: QaCheckItem[];
    summary: string;
    summaryAr: string;
  };
}

export interface QaCheckItem {
  name: string;
  nameAr: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  message: string;
  messageAr: string;
  file?: string;
  line?: number;
}

export interface QaReport {
  id: string;
  buildId: string;
  projectId: string;
  status: string;
  overallScore: number | null;
  lint: QaCheckResult | null;
  runtime: QaCheckResult | null;
  functional: QaCheckResult | null;
  retryCount: number;
  fixAttempts: FixAttemptRecord[];
  totalDurationMs: number | null;
  totalCostUsd: string;
  createdAt: string;
  completedAt: string | null;
}

interface FixAttemptRecord {
  attempt: number;
  phase: string;
  issues: string[];
  fixed: boolean;
  timestamp: string;
}

const MAX_RETRIES = 3;

function lintCheck(files: { filePath: string; content: string }[]): QaCheckResult {
  const checks: QaCheckItem[] = [];
  let totalScore = 100;

  const htmlFiles = files.filter((f) => f.filePath.endsWith(".html"));
  const cssFiles = files.filter((f) => f.filePath.endsWith(".css"));
  const jsFiles = files.filter((f) => f.filePath.endsWith(".js"));

  if (htmlFiles.length === 0) {
    checks.push({
      name: "HTML file exists",
      nameAr: "ملف HTML موجود",
      passed: false,
      severity: "error",
      message: "No HTML files found in project",
      messageAr: "لا توجد ملفات HTML في المشروع",
    });
    totalScore -= 30;
  }

  for (const file of htmlFiles) {
    const c = file.content;

    if (!c.includes("<!DOCTYPE html>") && !c.includes("<!doctype html>")) {
      checks.push({
        name: "DOCTYPE declaration",
        nameAr: "إعلان DOCTYPE",
        passed: false,
        severity: "error",
        message: `Missing DOCTYPE declaration`,
        messageAr: `إعلان DOCTYPE مفقود`,
        file: file.filePath,
      });
      totalScore -= 10;
    } else {
      checks.push({
        name: "DOCTYPE declaration",
        nameAr: "إعلان DOCTYPE",
        passed: true,
        severity: "info",
        message: "DOCTYPE declaration present",
        messageAr: "إعلان DOCTYPE موجود",
        file: file.filePath,
      });
    }

    if (!/<html[^>]*lang=/.test(c)) {
      checks.push({
        name: "HTML lang attribute",
        nameAr: "سمة اللغة في HTML",
        passed: false,
        severity: "warning",
        message: "Missing lang attribute on <html> tag",
        messageAr: "سمة lang مفقودة في وسم <html>",
        file: file.filePath,
      });
      totalScore -= 5;
    } else {
      checks.push({
        name: "HTML lang attribute",
        nameAr: "سمة اللغة في HTML",
        passed: true,
        severity: "info",
        message: "lang attribute present",
        messageAr: "سمة اللغة موجودة",
        file: file.filePath,
      });
    }

    if (!c.includes("<meta charset") && !c.includes('<meta charset')) {
      checks.push({
        name: "Meta charset",
        nameAr: "ترميز الأحرف",
        passed: false,
        severity: "warning",
        message: "Missing charset meta tag",
        messageAr: "وسم ترميز الأحرف مفقود",
        file: file.filePath,
      });
      totalScore -= 5;
    } else {
      checks.push({
        name: "Meta charset",
        nameAr: "ترميز الأحرف",
        passed: true,
        severity: "info",
        message: "Charset meta tag present",
        messageAr: "وسم ترميز الأحرف موجود",
        file: file.filePath,
      });
    }

    if (!c.includes("viewport")) {
      checks.push({
        name: "Viewport meta",
        nameAr: "وسم viewport",
        passed: false,
        severity: "warning",
        message: "Missing viewport meta tag (responsive design)",
        messageAr: "وسم viewport مفقود (تصميم متجاوب)",
        file: file.filePath,
      });
      totalScore -= 5;
    } else {
      checks.push({
        name: "Viewport meta",
        nameAr: "وسم viewport",
        passed: true,
        severity: "info",
        message: "Viewport meta tag present",
        messageAr: "وسم viewport موجود",
        file: file.filePath,
      });
    }

    if (!c.includes("<title>") && !c.includes("<title ")) {
      checks.push({
        name: "Title tag",
        nameAr: "وسم العنوان",
        passed: false,
        severity: "warning",
        message: "Missing <title> tag",
        messageAr: "وسم <title> مفقود",
        file: file.filePath,
      });
      totalScore -= 5;
    } else {
      checks.push({
        name: "Title tag",
        nameAr: "وسم العنوان",
        passed: true,
        severity: "info",
        message: "Title tag present",
        messageAr: "وسم العنوان موجود",
        file: file.filePath,
      });
    }

    if (/on\w+\s*=\s*["']/.test(c)) {
      checks.push({
        name: "Inline event handlers",
        nameAr: "معالجات الأحداث المضمنة",
        passed: false,
        severity: "warning",
        message: "Inline event handlers found (potential XSS risk)",
        messageAr: "وُجدت معالجات أحداث مضمنة (خطر XSS محتمل)",
        file: file.filePath,
      });
      totalScore -= 5;
    }

    const imgTags = c.match(/<img[^>]*>/gi) || [];
    const imgsWithoutAlt = imgTags.filter((t) => !/alt\s*=/.test(t));
    if (imgsWithoutAlt.length > 0) {
      checks.push({
        name: "Image alt attributes",
        nameAr: "سمات alt للصور",
        passed: false,
        severity: "warning",
        message: `${imgsWithoutAlt.length} image(s) missing alt attribute`,
        messageAr: `${imgsWithoutAlt.length} صورة بدون سمة alt`,
        file: file.filePath,
      });
      totalScore -= 3;
    } else if (imgTags.length > 0) {
      checks.push({
        name: "Image alt attributes",
        nameAr: "سمات alt للصور",
        passed: true,
        severity: "info",
        message: "All images have alt attributes",
        messageAr: "جميع الصور تحتوي على سمة alt",
        file: file.filePath,
      });
    }
  }

  for (const file of jsFiles) {
    if (file.content.includes("eval(")) {
      checks.push({
        name: "No eval() usage",
        nameAr: "عدم استخدام eval()",
        passed: false,
        severity: "error",
        message: "eval() usage detected (security risk)",
        messageAr: "تم اكتشاف استخدام eval() (خطر أمني)",
        file: file.filePath,
      });
      totalScore -= 15;
    }

    if (file.content.includes("document.write(")) {
      checks.push({
        name: "No document.write()",
        nameAr: "عدم استخدام document.write()",
        passed: false,
        severity: "warning",
        message: "document.write() usage detected",
        messageAr: "تم اكتشاف استخدام document.write()",
        file: file.filePath,
      });
      totalScore -= 5;
    }
  }

  for (const file of cssFiles) {
    if (file.content.includes("@media")) {
      checks.push({
        name: "Responsive CSS",
        nameAr: "CSS متجاوب",
        passed: true,
        severity: "info",
        message: "Media queries found (responsive design)",
        messageAr: "استعلامات الوسائط موجودة (تصميم متجاوب)",
        file: file.filePath,
      });
    }
  }

  if (checks.length === 0) {
    checks.push({
      name: "Basic structure",
      nameAr: "البنية الأساسية",
      passed: true,
      severity: "info",
      message: "No issues found",
      messageAr: "لم يتم العثور على مشاكل",
    });
  }

  const score = Math.max(0, Math.min(100, totalScore));
  const failed = checks.filter((c) => !c.passed && c.severity === "error");
  const warnings = checks.filter((c) => !c.passed && c.severity === "warning");

  return {
    status: failed.length > 0 ? "failed" : warnings.length > 0 ? "warning" : "passed",
    score,
    details: {
      checks,
      summary: `${checks.filter((c) => c.passed).length}/${checks.length} checks passed. ${failed.length} errors, ${warnings.length} warnings.`,
      summaryAr: `${checks.filter((c) => c.passed).length}/${checks.length} فحص ناجح. ${failed.length} أخطاء، ${warnings.length} تحذيرات.`,
    },
  };
}

function runtimeCheck(files: { filePath: string; content: string }[]): QaCheckResult {
  const checks: QaCheckItem[] = [];
  let totalScore = 100;

  const htmlFiles = files.filter((f) => f.filePath.endsWith(".html"));
  const cssFiles = files.filter((f) => f.filePath.endsWith(".css"));
  const jsFiles = files.filter((f) => f.filePath.endsWith(".js"));

  const indexHtml = htmlFiles.find(
    (f) => f.filePath === "index.html" || f.filePath.endsWith("/index.html")
  );

  if (!indexHtml) {
    checks.push({
      name: "Entry point exists",
      nameAr: "نقطة الدخول موجودة",
      passed: false,
      severity: "error",
      message: "No index.html entry point found",
      messageAr: "لم يتم العثور على ملف index.html",
    });
    totalScore -= 30;
  } else {
    checks.push({
      name: "Entry point exists",
      nameAr: "نقطة الدخول موجودة",
      passed: true,
      severity: "info",
      message: "index.html entry point found",
      messageAr: "ملف index.html موجود",
    });

    if (indexHtml.content.includes("<body") && indexHtml.content.includes("</body>")) {
      checks.push({
        name: "Body content",
        nameAr: "محتوى الصفحة",
        passed: true,
        severity: "info",
        message: "Body tag with content present",
        messageAr: "وسم body مع محتوى موجود",
      });
    } else {
      checks.push({
        name: "Body content",
        nameAr: "محتوى الصفحة",
        passed: false,
        severity: "error",
        message: "Missing or empty body tag",
        messageAr: "وسم body مفقود أو فارغ",
      });
      totalScore -= 20;
    }

    for (const css of cssFiles) {
      const linkRef = css.filePath.split("/").pop();
      if (indexHtml.content.includes(linkRef!)) {
        checks.push({
          name: `CSS linked: ${css.filePath}`,
          nameAr: `CSS مربوط: ${css.filePath}`,
          passed: true,
          severity: "info",
          message: `CSS file ${css.filePath} is linked in HTML`,
          messageAr: `ملف CSS ${css.filePath} مربوط في HTML`,
        });
      }
    }

    for (const js of jsFiles) {
      const scriptRef = js.filePath.split("/").pop();
      if (indexHtml.content.includes(scriptRef!)) {
        checks.push({
          name: `JS linked: ${js.filePath}`,
          nameAr: `JS مربوط: ${js.filePath}`,
          passed: true,
          severity: "info",
          message: `JS file ${js.filePath} is linked in HTML`,
          messageAr: `ملف JS ${js.filePath} مربوط في HTML`,
        });
      }
    }
  }

  for (const css of cssFiles) {
    const unclosedBraces = (css.content.match(/{/g) || []).length - (css.content.match(/}/g) || []).length;
    if (unclosedBraces !== 0) {
      checks.push({
        name: "CSS syntax",
        nameAr: "بنية CSS",
        passed: false,
        severity: "error",
        message: `Unbalanced braces in ${css.filePath} (${unclosedBraces > 0 ? "unclosed" : "extra closing"})`,
        messageAr: `أقواس غير متوازنة في ${css.filePath}`,
        file: css.filePath,
      });
      totalScore -= 15;
    }
  }

  for (const js of jsFiles) {
    const braces = (js.content.match(/{/g) || []).length - (js.content.match(/}/g) || []).length;
    const parens = (js.content.match(/\(/g) || []).length - (js.content.match(/\)/g) || []).length;
    if (braces !== 0 || parens !== 0) {
      checks.push({
        name: "JS syntax",
        nameAr: "بنية JavaScript",
        passed: false,
        severity: "error",
        message: `Syntax issue in ${js.filePath}: unbalanced ${braces !== 0 ? "braces" : "parentheses"}`,
        messageAr: `مشكلة في بنية ${js.filePath}: أقواس غير متوازنة`,
        file: js.filePath,
      });
      totalScore -= 15;
    }
  }

  const score = Math.max(0, Math.min(100, totalScore));
  const failed = checks.filter((c) => !c.passed && c.severity === "error");
  const warnings = checks.filter((c) => !c.passed && c.severity === "warning");

  return {
    status: failed.length > 0 ? "failed" : warnings.length > 0 ? "warning" : "passed",
    score,
    details: {
      checks,
      summary: `Runtime validation: ${checks.filter((c) => c.passed).length}/${checks.length} passed. ${failed.length} errors.`,
      summaryAr: `التحقق من التشغيل: ${checks.filter((c) => c.passed).length}/${checks.length} ناجح. ${failed.length} أخطاء.`,
    },
  };
}

function functionalCheck(files: { filePath: string; content: string }[]): QaCheckResult {
  const checks: QaCheckItem[] = [];
  let totalScore = 100;

  const htmlFiles = files.filter((f) => f.filePath.endsWith(".html"));
  const allContent = files.map((f) => f.content).join("\n");

  if (htmlFiles.length > 0) {
    const hasNavigation = allContent.includes("<nav") || allContent.includes("<header");
    checks.push({
      name: "Navigation present",
      nameAr: "التنقل موجود",
      passed: hasNavigation,
      severity: hasNavigation ? "info" : "warning",
      message: hasNavigation ? "Navigation/header element found" : "No navigation element found",
      messageAr: hasNavigation ? "عنصر التنقل موجود" : "عنصر التنقل غير موجود",
    });
    if (!hasNavigation) totalScore -= 5;

    const hasLinks = /<a\s+[^>]*href/i.test(allContent);
    checks.push({
      name: "Interactive links",
      nameAr: "روابط تفاعلية",
      passed: hasLinks,
      severity: hasLinks ? "info" : "warning",
      message: hasLinks ? "Interactive links found" : "No interactive links found",
      messageAr: hasLinks ? "روابط تفاعلية موجودة" : "لا توجد روابط تفاعلية",
    });
    if (!hasLinks) totalScore -= 3;

    const hasSemanticTags = /<(main|section|article|aside|footer)/i.test(allContent);
    checks.push({
      name: "Semantic HTML",
      nameAr: "HTML دلالي",
      passed: hasSemanticTags,
      severity: hasSemanticTags ? "info" : "warning",
      message: hasSemanticTags ? "Semantic HTML tags used" : "No semantic HTML tags found",
      messageAr: hasSemanticTags ? "وسوم HTML دلالية مستخدمة" : "لا توجد وسوم HTML دلالية",
    });
    if (!hasSemanticTags) totalScore -= 5;

    const hasRtlSupport = /dir\s*=\s*["']rtl/i.test(allContent) || /direction\s*:\s*rtl/i.test(allContent);
    checks.push({
      name: "RTL support",
      nameAr: "دعم RTL",
      passed: hasRtlSupport,
      severity: hasRtlSupport ? "info" : "warning",
      message: hasRtlSupport ? "RTL direction support found" : "No RTL support detected",
      messageAr: hasRtlSupport ? "دعم اتجاه RTL موجود" : "لم يتم اكتشاف دعم RTL",
    });
    if (!hasRtlSupport) totalScore -= 3;

    const hasVisibleContent = /<(h[1-6]|p|div|span|button|input|form)/i.test(allContent);
    checks.push({
      name: "Visible content",
      nameAr: "محتوى مرئي",
      passed: hasVisibleContent,
      severity: hasVisibleContent ? "info" : "error",
      message: hasVisibleContent ? "Visible content elements present" : "No visible content elements found",
      messageAr: hasVisibleContent ? "عناصر محتوى مرئية موجودة" : "لا توجد عناصر محتوى مرئية",
    });
    if (!hasVisibleContent) totalScore -= 20;

    const hasForms = /<form/i.test(allContent);
    const hasButtons = /<button/i.test(allContent);
    if (hasForms || hasButtons) {
      checks.push({
        name: "Interactive elements",
        nameAr: "عناصر تفاعلية",
        passed: true,
        severity: "info",
        message: `Found ${hasForms ? "forms" : ""}${hasForms && hasButtons ? " and " : ""}${hasButtons ? "buttons" : ""}`,
        messageAr: `وُجدت ${hasForms ? "نماذج" : ""}${hasForms && hasButtons ? " و" : ""}${hasButtons ? "أزرار" : ""}`,
      });
    }
  }

  const score = Math.max(0, Math.min(100, totalScore));
  const failed = checks.filter((c) => !c.passed && c.severity === "error");
  const warnings = checks.filter((c) => !c.passed && c.severity === "warning");

  return {
    status: failed.length > 0 ? "failed" : warnings.length > 0 ? "warning" : "passed",
    score,
    details: {
      checks,
      summary: `Functional check: ${checks.filter((c) => c.passed).length}/${checks.length} passed. ${failed.length} errors, ${warnings.length} warnings.`,
      summaryAr: `الفحص الوظيفي: ${checks.filter((c) => c.passed).length}/${checks.length} ناجح. ${failed.length} أخطاء، ${warnings.length} تحذيرات.`,
    },
  };
}

export function collectQaIssues(
  lint: QaCheckResult,
  runtime: QaCheckResult,
  functional: QaCheckResult
): CodeIssue[] {
  const issues: CodeIssue[] = [];

  const allChecks = [
    ...lint.details.checks,
    ...runtime.details.checks,
    ...functional.details.checks,
  ];

  for (const check of allChecks) {
    if (!check.passed && (check.severity === "error" || check.severity === "warning")) {
      issues.push({
        file: check.file || "unknown",
        line: check.line,
        severity: check.severity,
        message: check.message,
      });
    }
  }

  return issues;
}

export async function runQaPipeline(
  buildId: string,
  projectId: string
): Promise<string> {
  const startTime = Date.now();

  const [report] = await db
    .insert(qaReportsTable)
    .values({
      buildId,
      projectId,
      status: "in_progress",
    })
    .returning();

  const reportId = report.id;

  try {
    const files = await db
      .select({ filePath: projectFilesTable.filePath, content: projectFilesTable.content })
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, projectId));

    if (files.length === 0) {
      await db
        .update(qaReportsTable)
        .set({
          status: "failed",
          overallScore: 0,
          lintStatus: "failed",
          lintScore: 0,
          lintDetails: { checks: [], summary: "No files to check", summaryAr: "لا توجد ملفات للفحص" },
          runtimeStatus: "failed",
          runtimeScore: 0,
          runtimeDetails: { checks: [], summary: "No files to run", summaryAr: "لا توجد ملفات للتشغيل" },
          functionalStatus: "failed",
          functionalScore: 0,
          functionalDetails: { checks: [], summary: "No files to test", summaryAr: "لا توجد ملفات للاختبار" },
          totalDurationMs: Date.now() - startTime,
          completedAt: new Date(),
        })
        .where(eq(qaReportsTable.id, reportId));
      return reportId;
    }

    const result = await runQaValidation(files);

    await db
      .update(qaReportsTable)
      .set({
        status: result.status,
        overallScore: result.overallScore,
        lintStatus: result.lint.status,
        lintScore: result.lint.score,
        lintDetails: result.lint.details,
        runtimeStatus: result.runtime.status,
        runtimeScore: result.runtime.score,
        runtimeDetails: result.runtime.details,
        functionalStatus: result.functional.status,
        functionalScore: result.functional.score,
        functionalDetails: result.functional.details,
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date(),
      })
      .where(eq(qaReportsTable.id, reportId));

    return reportId;
  } catch (error) {
    await db
      .update(qaReportsTable)
      .set({
        status: "error",
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date(),
      })
      .where(eq(qaReportsTable.id, reportId));
    throw error;
  }
}

async function runQaValidation(
  files: { filePath: string; content: string }[]
): Promise<{ lint: QaCheckResult; runtime: QaCheckResult; functional: QaCheckResult; overallScore: number; status: string }> {
  const lint = lintCheck(files);
  const runtime = runtimeCheck(files);
  const functional = functionalCheck(files);

  const overallScore = Math.round(
    (lint.score * 0.35) + (runtime.score * 0.35) + (functional.score * 0.30)
  );

  const hasErrors = lint.status === "failed" || runtime.status === "failed" || functional.status === "failed";
  const hasWarnings = lint.status === "warning" || runtime.status === "warning" || functional.status === "warning";
  const status = hasErrors ? "failed" : hasWarnings ? "warning" : "passed";

  return { lint, runtime, functional, overallScore, status };
}

function collectFailedIssues(
  lint: QaCheckResult,
  runtime: QaCheckResult,
  functional: QaCheckResult
): CodeIssue[] {
  const issues: CodeIssue[] = [];

  for (const check of [...lint.details.checks, ...runtime.details.checks, ...functional.details.checks]) {
    if (!check.passed && check.severity === "error") {
      issues.push({
        file: check.file || "unknown",
        line: check.line,
        severity: check.severity,
        message: check.message,
      });
    }
  }

  return issues;
}

export async function runQaWithRetry(
  buildId: string,
  projectId: string,
  userId: string
): Promise<string> {
  const startTime = Date.now();
  const constitution = getConstitution();
  const fixerAgent = new FixerAgent(constitution);
  const fileManager = new FileManagerAgent(constitution);
  const fixAttemptsLog: FixAttemptRecord[] = [];

  const [report] = await db
    .insert(qaReportsTable)
    .values({
      buildId,
      projectId,
      status: "in_progress",
    })
    .returning();

  const reportId = report.id;

  try {
    let files = await db
      .select({ filePath: projectFilesTable.filePath, content: projectFilesTable.content })
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, projectId));

    if (files.length === 0) {
      await db
        .update(qaReportsTable)
        .set({
          status: "failed",
          overallScore: 0,
          lintStatus: "failed",
          lintScore: 0,
          lintDetails: { checks: [], summary: "No files to check", summaryAr: "لا توجد ملفات للفحص" },
          runtimeStatus: "failed",
          runtimeScore: 0,
          runtimeDetails: { checks: [], summary: "No files to run", summaryAr: "لا توجد ملفات للتشغيل" },
          functionalStatus: "failed",
          functionalScore: 0,
          functionalDetails: { checks: [], summary: "No files to test", summaryAr: "لا توجد ملفات للاختبار" },
          totalDurationMs: Date.now() - startTime,
          completedAt: new Date(),
        })
        .where(eq(qaReportsTable.id, reportId));
      return reportId;
    }

    let result = await runQaValidation(files);
    let retryCount = 0;

    while (result.status === "failed" && retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`[QA] Build ${buildId}: QA failed (score: ${result.overallScore}), auto-fix attempt ${retryCount}/${MAX_RETRIES}`);

      const issues = collectFailedIssues(result.lint, result.runtime, result.functional);
      const failedPhase = result.lint.status === "failed" ? "lint" : result.runtime.status === "failed" ? "runtime" : "functional";

      let fixed = false;

      try {
        const buildContext: BuildContext = {
          buildId,
          projectId,
          userId,
          prompt: `Fix QA issues found during ${failedPhase} phase`,
          existingFiles: files.map((f) => ({
            filePath: f.filePath,
            content: f.content,
          })),
          tokensUsedSoFar: 0,
        };

        const fixResult = await fixerAgent.executeWithIssues(buildContext, issues);

        if (fixResult.success && fixResult.data?.files) {
          const fixedFiles = fixResult.data.files as GeneratedFile[];

          if (fixedFiles.length > 0) {
            await fileManager.saveFiles(projectId, fixedFiles);

            files = await db
              .select({ filePath: projectFilesTable.filePath, content: projectFilesTable.content })
              .from(projectFilesTable)
              .where(eq(projectFilesTable.projectId, projectId));

            const newResult = await runQaValidation(files);
            fixed = newResult.overallScore > result.overallScore;
            result = newResult;
          }
        }
      } catch (fixError) {
        console.error(`[QA] Build ${buildId}: Fix attempt ${retryCount} error:`, fixError);
      }

      fixAttemptsLog.push({
        attempt: retryCount,
        phase: failedPhase,
        issues: issues.slice(0, 10).map((i) => i.message),
        fixed,
        timestamp: new Date().toISOString(),
      });

      await db
        .update(qaReportsTable)
        .set({
          retryCount,
          fixAttempts: fixAttemptsLog,
        })
        .where(eq(qaReportsTable.id, reportId));
    }

    await db
      .update(qaReportsTable)
      .set({
        status: result.status,
        overallScore: result.overallScore,
        lintStatus: result.lint.status,
        lintScore: result.lint.score,
        lintDetails: result.lint.details,
        runtimeStatus: result.runtime.status,
        runtimeScore: result.runtime.score,
        runtimeDetails: result.runtime.details,
        functionalStatus: result.functional.status,
        functionalScore: result.functional.score,
        functionalDetails: result.functional.details,
        fixAttempts: fixAttemptsLog.length > 0 ? fixAttemptsLog : null,
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date(),
      })
      .where(eq(qaReportsTable.id, reportId));

    await db.insert(executionLogsTable).values({
      buildId,
      projectId,
      taskId: null,
      agentType: "qa_pipeline",
      action: "qa_validation",
      status: result.status,
      details: {
        overallScore: result.overallScore,
        lintScore: result.lint.score,
        runtimeScore: result.runtime.score,
        functionalScore: result.functional.score,
        retryCount,
        fixAttempts: fixAttemptsLog.length,
      },
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
    });

    return reportId;
  } catch (error) {
    await db
      .update(qaReportsTable)
      .set({
        status: "error",
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date(),
      })
      .where(eq(qaReportsTable.id, reportId));
    throw error;
  }
}
