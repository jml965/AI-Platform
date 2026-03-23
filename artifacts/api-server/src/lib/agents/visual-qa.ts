import type { GeneratedFile } from "./types";

export interface VisualQaResult {
  score: number;
  status: "excellent" | "good" | "needs-improvement" | "poor";
  checks: VisualQaCheck[];
  summary: string;
  summaryAr: string;
}

export interface VisualQaCheck {
  name: string;
  nameAr: string;
  passed: boolean;
  severity: "critical" | "warning" | "info";
  message: string;
  messageAr: string;
  suggestion?: string;
  suggestionAr?: string;
}

export function runVisualQa(files: GeneratedFile[]): VisualQaResult {
  const checks: VisualQaCheck[] = [];
  let score = 100;

  const htmlFiles = files.filter(f => f.filePath.endsWith(".html"));
  const cssFiles = files.filter(f => f.filePath.endsWith(".css"));
  const tsxFiles = files.filter(f => f.filePath.endsWith(".tsx") || f.filePath.endsWith(".jsx"));
  const allContent = files.map(f => f.content).join("\n");

  score += checkTypographyHierarchy(allContent, checks);
  score += checkSpacingSystem(allContent, checks);
  score += checkColorUsage(allContent, checks);
  score += checkShadowsAndDepth(allContent, checks);
  score += checkHoverAnimations(allContent, checks);
  score += checkImageQuality(allContent, checks);
  score += checkSectionStructure(allContent, tsxFiles, checks);
  score += checkResponsiveDesign(allContent, checks);
  score += checkRtlSupport(allContent, checks);
  score += checkNavbarFooter(allContent, checks);

  score = Math.max(0, Math.min(100, score));

  let status: VisualQaResult["status"];
  if (score >= 85) status = "excellent";
  else if (score >= 70) status = "good";
  else if (score >= 50) status = "needs-improvement";
  else status = "poor";

  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed).length;

  return {
    score,
    status,
    checks,
    summary: `Visual QA: ${score}/100 (${status}) — ${passed} passed, ${failed} issues found`,
    summaryAr: `فحص بصري: ${score}/100 (${status === "excellent" ? "ممتاز" : status === "good" ? "جيد" : status === "needs-improvement" ? "يحتاج تحسين" : "ضعيف"}) — ${passed} ناجح، ${failed} ملاحظات`,
  };
}

function checkTypographyHierarchy(content: string, checks: VisualQaCheck[]): number {
  let penalty = 0;

  const hasLargeHeading = /text-[4-7]xl|text-\[3[2-9]px\]|text-\[4\dpx\]|text-\[5\dpx\]|text-\[6\dpx\]|font-size:\s*(3[2-9]|[4-9]\d)px/.test(content);
  if (hasLargeHeading) {
    checks.push({ name: "Hero heading size", nameAr: "حجم عنوان الهيرو", passed: true, severity: "info", message: "Large hero heading found (text-4xl+)", messageAr: "عنوان هيرو كبير موجود" });
  } else {
    checks.push({ name: "Hero heading size", nameAr: "حجم عنوان الهيرو", passed: false, severity: "critical", message: "No large heading found. Hero h1 should be text-5xl or larger", messageAr: "لا يوجد عنوان كبير. يجب أن يكون h1 الهيرو بحجم text-5xl أو أكبر", suggestion: "Use text-5xl lg:text-7xl font-bold for hero headings", suggestionAr: "استخدم text-5xl lg:text-7xl font-bold لعناوين الهيرو" });
    penalty -= 8;
  }

  const hasFontBold = /font-bold|font-semibold|font-weight:\s*(600|700|800|900)/.test(content);
  if (hasFontBold) {
    checks.push({ name: "Font weight hierarchy", nameAr: "تسلسل وزن الخطوط", passed: true, severity: "info", message: "Bold/semibold fonts used for emphasis", messageAr: "خطوط عريضة مستخدمة للتأكيد" });
  } else {
    checks.push({ name: "Font weight hierarchy", nameAr: "تسلسل وزن الخطوط", passed: false, severity: "warning", message: "No font-bold or font-semibold found", messageAr: "لا يوجد font-bold أو font-semibold", suggestion: "Use font-bold for headings and font-semibold for subheadings", suggestionAr: "استخدم font-bold للعناوين وfont-semibold للعناوين الفرعية" });
    penalty -= 5;
  }

  const hasLeadingRelaxed = /leading-relaxed|leading-loose|line-height:\s*1\.[5-9]/.test(content);
  if (hasLeadingRelaxed) {
    checks.push({ name: "Body text line height", nameAr: "ارتفاع سطر النص", passed: true, severity: "info", message: "Relaxed line height for body text", messageAr: "ارتفاع سطر مريح للنص الأساسي" });
  } else {
    checks.push({ name: "Body text line height", nameAr: "ارتفاع سطر النص", passed: false, severity: "warning", message: "No leading-relaxed found — text may be cramped", messageAr: "leading-relaxed مفقود — النص قد يكون متلاصق", suggestion: "Add leading-relaxed or leading-loose to body text", suggestionAr: "أضف leading-relaxed أو leading-loose للنص الأساسي" });
    penalty -= 3;
  }

  return penalty;
}

function checkSpacingSystem(content: string, checks: VisualQaCheck[]): number {
  let penalty = 0;

  const hasProperSectionPadding = /py-(?:1[6-9]|2[0-9]|3\d)|padding(?:-top|-bottom)?:\s*(?:[4-9]\d|[1-9]\d{2})px/.test(content);
  if (hasProperSectionPadding) {
    checks.push({ name: "Section padding", nameAr: "حشو الأقسام", passed: true, severity: "info", message: "Adequate section padding (py-16+)", messageAr: "حشو أقسام كافٍ (py-16+)" });
  } else {
    checks.push({ name: "Section padding", nameAr: "حشو الأقسام", passed: false, severity: "critical", message: "Sections may have insufficient padding. Use py-20 to py-28", messageAr: "الأقسام قد تكون بحشو غير كافٍ. استخدم py-20 إلى py-28", suggestion: "Wrap sections with py-20 or py-24 for breathing room", suggestionAr: "غلّف الأقسام بـ py-20 أو py-24 لمساحة تنفس" });
    penalty -= 6;
  }

  const hasMaxWidth = /max-w-(?:7xl|6xl|5xl|4xl|3xl)|max-width:\s*(?:1[0-2]\d\d|[89]\d\d)px/.test(content);
  if (hasMaxWidth) {
    checks.push({ name: "Container max-width", nameAr: "عرض الحاوية الأقصى", passed: true, severity: "info", message: "Container width constrained (max-w-7xl or similar)", messageAr: "عرض الحاوية مقيّد" });
  } else {
    checks.push({ name: "Container max-width", nameAr: "عرض الحاوية الأقصى", passed: false, severity: "warning", message: "No max-width container found — content may stretch too wide", messageAr: "لا يوجد max-width — المحتوى قد يمتد بشكل مفرط", suggestion: "Use max-w-7xl mx-auto for main containers", suggestionAr: "استخدم max-w-7xl mx-auto للحاويات الرئيسية" });
    penalty -= 5;
  }

  const hasProperGaps = /gap-[4-9]|gap-\d{2}|gap:\s*(?:1[6-9]|[2-9]\d)px/.test(content);
  if (hasProperGaps) {
    checks.push({ name: "Grid/flex gaps", nameAr: "فجوات الشبكة", passed: true, severity: "info", message: "Proper spacing between elements (gap-4+)", messageAr: "مسافات مناسبة بين العناصر" });
  } else {
    checks.push({ name: "Grid/flex gaps", nameAr: "فجوات الشبكة", passed: false, severity: "warning", message: "Small or missing gaps between elements", messageAr: "فجوات صغيرة أو مفقودة بين العناصر" });
    penalty -= 3;
  }

  return penalty;
}

function checkColorUsage(content: string, checks: VisualQaCheck[]): number {
  let penalty = 0;

  const hasColorVariable = /var\(--color-primary\)|var\(--color-secondary\)|var\(--color-accent\)/.test(content);
  const hasDirectColor = /bg-(?:blue|purple|indigo|emerald|red|orange|pink|teal|cyan|rose|violet|amber|lime|sky|fuchsia)-(?:500|600|700)/.test(content);
  const hasGradient = /bg-gradient-to|linear-gradient/.test(content);

  if (hasColorVariable || hasDirectColor) {
    checks.push({ name: "Primary color consistency", nameAr: "اتساق اللون الرئيسي", passed: true, severity: "info", message: "Consistent primary color usage found", messageAr: "استخدام لون رئيسي متسق" });
  } else {
    checks.push({ name: "Primary color consistency", nameAr: "اتساق اللون الرئيسي", passed: false, severity: "critical", message: "No clear primary color. Use CSS variables or consistent Tailwind colors", messageAr: "لا يوجد لون رئيسي واضح", suggestion: "Define --color-primary and use it for buttons, links, accents", suggestionAr: "عرّف --color-primary واستخدمه للأزرار والروابط" });
    penalty -= 8;
  }

  if (hasGradient) {
    checks.push({ name: "Gradient usage", nameAr: "استخدام التدرجات", passed: true, severity: "info", message: "Gradients used for visual richness", messageAr: "تدرجات مستخدمة للثراء البصري" });
  } else {
    checks.push({ name: "Gradient usage", nameAr: "استخدام التدرجات", passed: false, severity: "warning", message: "No gradients found. Add gradients for hero/CTA sections", messageAr: "لا توجد تدرجات. أضف تدرجات لأقسام الهيرو/CTA" });
    penalty -= 3;
  }

  const hasMutedText = /text-(?:gray|slate|zinc|neutral)-(?:[456]\d\d)|color-text-muted|#(?:6[4-9a-f]|[7-9a-b])\w{4}/i.test(content);
  if (hasMutedText) {
    checks.push({ name: "Muted text for secondary content", nameAr: "نص خافت للمحتوى الثانوي", passed: true, severity: "info", message: "Muted text colors used for descriptions", messageAr: "ألوان نص خافتة مستخدمة للوصف" });
  } else {
    checks.push({ name: "Muted text for secondary content", nameAr: "نص خافت للمحتوى الثانوي", passed: false, severity: "warning", message: "No muted text colors — everything may look the same weight", messageAr: "لا توجد ألوان نص خافتة" });
    penalty -= 3;
  }

  return penalty;
}

function checkShadowsAndDepth(content: string, checks: VisualQaCheck[]): number {
  let penalty = 0;

  const hasShadow = /shadow-(?:sm|md|lg|xl|2xl)|box-shadow/.test(content);
  if (hasShadow) {
    checks.push({ name: "Shadow depth", nameAr: "عمق الظلال", passed: true, severity: "info", message: "Shadows used for depth and elevation", messageAr: "ظلال مستخدمة للعمق والارتفاع" });
  } else {
    checks.push({ name: "Shadow depth", nameAr: "عمق الظلال", passed: false, severity: "warning", message: "No shadows found. Cards and buttons need shadow for depth", messageAr: "لا توجد ظلال. البطاقات والأزرار تحتاج ظلال", suggestion: "Add shadow-sm to cards, shadow-lg to buttons", suggestionAr: "أضف shadow-sm للبطاقات وshadow-lg للأزرار" });
    penalty -= 5;
  }

  const hasBackdropBlur = /backdrop-blur|backdrop-filter/.test(content);
  if (hasBackdropBlur) {
    checks.push({ name: "Glass/blur effects", nameAr: "تأثيرات زجاجية", passed: true, severity: "info", message: "Backdrop blur used for glass effects", messageAr: "تأثير زجاجي مستخدم" });
  } else {
    checks.push({ name: "Glass/blur effects", nameAr: "تأثيرات زجاجية", passed: false, severity: "info", message: "No glass effects — consider adding for navbar", messageAr: "لا توجد تأثيرات زجاجية" });
    penalty -= 2;
  }

  const hasRounded = /rounded-(?:xl|2xl|3xl|full)|border-radius:\s*(?:1[2-9]|[2-9]\d)px/.test(content);
  if (hasRounded) {
    checks.push({ name: "Rounded corners", nameAr: "زوايا مدوّرة", passed: true, severity: "info", message: "Modern rounded corners used", messageAr: "زوايا مدوّرة حديثة مستخدمة" });
  } else {
    checks.push({ name: "Rounded corners", nameAr: "زوايا مدوّرة", passed: false, severity: "warning", message: "No large rounded corners. Use rounded-xl or rounded-2xl for cards", messageAr: "لا توجد زوايا مدوّرة كبيرة" });
    penalty -= 3;
  }

  return penalty;
}

function checkHoverAnimations(content: string, checks: VisualQaCheck[]): number {
  let penalty = 0;

  const hasHoverEffect = /hover:|:hover/.test(content);
  if (hasHoverEffect) {
    checks.push({ name: "Hover effects", nameAr: "تأثيرات التحويم", passed: true, severity: "info", message: "Hover interactions present", messageAr: "تفاعلات التحويم موجودة" });
  } else {
    checks.push({ name: "Hover effects", nameAr: "تأثيرات التحويم", passed: false, severity: "critical", message: "No hover effects! All interactive elements need hover states", messageAr: "لا توجد تأثيرات تحويم! كل العناصر التفاعلية تحتاج حالات تحويم" });
    penalty -= 8;
  }

  const hasTransition = /transition-(?:all|colors|transform|shadow|opacity)|transition:\s/.test(content);
  if (hasTransition) {
    checks.push({ name: "Smooth transitions", nameAr: "انتقالات سلسة", passed: true, severity: "info", message: "CSS transitions for smooth interactions", messageAr: "انتقالات CSS لتفاعلات سلسة" });
  } else {
    checks.push({ name: "Smooth transitions", nameAr: "انتقالات سلسة", passed: false, severity: "warning", message: "No transitions. Add transition-all duration-300 to interactive elements", messageAr: "لا توجد انتقالات" });
    penalty -= 5;
  }

  const hasTranslateY = /translate-y|translateY|hover:-translate-y/.test(content);
  if (hasTranslateY) {
    checks.push({ name: "Hover lift effect", nameAr: "تأثير الرفع عند التحويم", passed: true, severity: "info", message: "Hover lift animations found", messageAr: "حركات رفع عند التحويم موجودة" });
  } else {
    checks.push({ name: "Hover lift effect", nameAr: "تأثير الرفع عند التحويم", passed: false, severity: "info", message: "No hover lift. Consider hover:-translate-y-1 for cards", messageAr: "لا يوجد تأثير رفع عند التحويم" });
    penalty -= 2;
  }

  return penalty;
}

function checkImageQuality(content: string, checks: VisualQaCheck[]): number {
  let penalty = 0;

  const hasRealImages = /unsplash\.com|pexels\.com|pravatar\.cc|picsum\.photos/.test(content);
  const hasPlaceholder = /via\.placeholder|placeholder\.com|placehold\.co|placehold\.it/.test(content);

  if (hasRealImages) {
    checks.push({ name: "Real images", nameAr: "صور حقيقية", passed: true, severity: "info", message: "Real stock images from Unsplash/Pexels used", messageAr: "صور حقيقية من Unsplash/Pexels مستخدمة" });
  } else if (hasPlaceholder) {
    checks.push({ name: "Real images", nameAr: "صور حقيقية", passed: false, severity: "critical", message: "Placeholder images detected! Use real Unsplash photos", messageAr: "صور بديلة مكتشفة! استخدم صور Unsplash حقيقية", suggestion: "Replace placeholder.com URLs with images.unsplash.com/photo-{id}?w=800&h=600&fit=crop", suggestionAr: "استبدل روابط placeholder.com بصور من Unsplash" });
    penalty -= 10;
  } else {
    checks.push({ name: "Real images", nameAr: "صور حقيقية", passed: false, severity: "warning", message: "No stock image URLs found", messageAr: "لا توجد روابط صور مخزنية" });
    penalty -= 5;
  }

  const hasObjectCover = /object-cover|object-fit:\s*cover/.test(content);
  if (hasObjectCover) {
    checks.push({ name: "Image object-fit", nameAr: "ملاءمة الصور", passed: true, severity: "info", message: "Images use object-cover for proper aspect ratio", messageAr: "الصور تستخدم object-cover لنسبة أبعاد صحيحة" });
  } else {
    checks.push({ name: "Image object-fit", nameAr: "ملاءمة الصور", passed: false, severity: "warning", message: "No object-cover on images — may stretch or distort", messageAr: "لا يوجد object-cover على الصور — قد تتمدد أو تشوه" });
    penalty -= 3;
  }

  return penalty;
}

function checkSectionStructure(content: string, tsxFiles: GeneratedFile[], checks: VisualQaCheck[]): number {
  let penalty = 0;

  const hasHero = /hero|بطل|الرئيسي/i.test(content);
  const hasNavbar = /navbar|nav|header|navigation|شريط/i.test(content);
  const hasFooter = /footer|تذييل/i.test(content);
  const hasFeatures = /features|services|خدمات|ميزات/i.test(content);
  const hasCta = /cta|call.to.action|تواصل|اتصل/i.test(content);

  const sectionCount = [hasHero, hasNavbar, hasFooter, hasFeatures, hasCta].filter(Boolean).length;

  if (sectionCount >= 4) {
    checks.push({ name: "Complete section structure", nameAr: "هيكل أقسام كامل", passed: true, severity: "info", message: `${sectionCount}/5 essential sections found (Hero, Navbar, Features, CTA, Footer)`, messageAr: `${sectionCount}/5 أقسام أساسية موجودة` });
  } else if (sectionCount >= 2) {
    checks.push({ name: "Complete section structure", nameAr: "هيكل أقسام كامل", passed: false, severity: "warning", message: `Only ${sectionCount}/5 essential sections. Missing: ${[!hasHero && "Hero", !hasNavbar && "Navbar", !hasFeatures && "Features", !hasCta && "CTA", !hasFooter && "Footer"].filter(Boolean).join(", ")}`, messageAr: `${sectionCount}/5 أقسام فقط` });
    penalty -= 5;
  } else {
    checks.push({ name: "Complete section structure", nameAr: "هيكل أقسام كامل", passed: false, severity: "critical", message: "Website lacks essential sections. Need: Hero, Navbar, Features, CTA, Footer", messageAr: "الموقع ينقصه أقسام أساسية" });
    penalty -= 10;
  }

  if (tsxFiles.length >= 3) {
    checks.push({ name: "Component separation", nameAr: "فصل المكونات", passed: true, severity: "info", message: `${tsxFiles.length} component files — good separation`, messageAr: `${tsxFiles.length} ملف مكونات — فصل جيد` });
  } else if (tsxFiles.length > 0) {
    checks.push({ name: "Component separation", nameAr: "فصل المكونات", passed: false, severity: "warning", message: "Few component files — consider splitting into separate components", messageAr: "ملفات مكونات قليلة — يُفضل الفصل" });
    penalty -= 3;
  }

  return penalty;
}

function checkResponsiveDesign(content: string, checks: VisualQaCheck[]): number {
  let penalty = 0;

  const hasResponsiveBreakpoints = /(?:sm|md|lg|xl|2xl):/i.test(content);
  const hasMediaQuery = /@media\s*\(/.test(content);

  if (hasResponsiveBreakpoints || hasMediaQuery) {
    checks.push({ name: "Responsive design", nameAr: "تصميم متجاوب", passed: true, severity: "info", message: "Responsive breakpoints or media queries found", messageAr: "نقاط توقف متجاوبة أو استعلامات وسائط موجودة" });
  } else {
    checks.push({ name: "Responsive design", nameAr: "تصميم متجاوب", passed: false, severity: "critical", message: "No responsive breakpoints! Website won't look good on mobile", messageAr: "لا توجد نقاط توقف متجاوبة! الموقع لن يظهر جيداً على الموبايل", suggestion: "Use sm:, md:, lg: prefixes for responsive layouts", suggestionAr: "استخدم sm:, md:, lg: للتخطيطات المتجاوبة" });
    penalty -= 10;
  }

  const hasFlexOrGrid = /flex|grid|grid-cols/.test(content);
  if (hasFlexOrGrid) {
    checks.push({ name: "Modern layout", nameAr: "تخطيط حديث", passed: true, severity: "info", message: "Flexbox/Grid layout used", messageAr: "تخطيط Flexbox/Grid مستخدم" });
  } else {
    checks.push({ name: "Modern layout", nameAr: "تخطيط حديث", passed: false, severity: "warning", message: "No flexbox or grid found — layout may not be adaptive", messageAr: "لا يوجد flexbox أو grid" });
    penalty -= 5;
  }

  return penalty;
}

function checkRtlSupport(content: string, checks: VisualQaCheck[]): number {
  let penalty = 0;

  const hasArabicText = /[\u0600-\u06FF]/.test(content);
  if (!hasArabicText) return 0;

  const hasRtlDir = /dir\s*=\s*["']rtl["']|direction:\s*rtl/.test(content);
  if (hasRtlDir) {
    checks.push({ name: "RTL direction", nameAr: "اتجاه RTL", passed: true, severity: "info", message: "RTL direction properly set for Arabic content", messageAr: "اتجاه RTL مضبوط بشكل صحيح" });
  } else {
    checks.push({ name: "RTL direction", nameAr: "اتجاه RTL", passed: false, severity: "critical", message: "Arabic text found but no dir='rtl'. Add dir='rtl' to html or body", messageAr: "نص عربي موجود لكن بدون dir='rtl'", suggestion: "Add dir='rtl' to <html> or <body> tag", suggestionAr: "أضف dir='rtl' لوسم <html> أو <body>" });
    penalty -= 8;
  }

  const hasArabicFont = /Tajawal|Cairo|Noto\s*Kufi|Almarai|Changa|IBM Plex Arabic|Noto Sans Arabic/i.test(content);
  if (hasArabicFont) {
    checks.push({ name: "Arabic font", nameAr: "خط عربي", passed: true, severity: "info", message: "Arabic-specific font loaded", messageAr: "خط عربي متخصص محمّل" });
  } else {
    checks.push({ name: "Arabic font", nameAr: "خط عربي", passed: false, severity: "warning", message: "No Arabic font. Use Tajawal or Cairo from Google Fonts", messageAr: "لا يوجد خط عربي. استخدم Tajawal أو Cairo", suggestion: "Add @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap')", suggestionAr: "أضف @import لخط Tajawal من Google Fonts" });
    penalty -= 5;
  }

  return penalty;
}

function checkNavbarFooter(content: string, checks: VisualQaCheck[]): number {
  let penalty = 0;

  const hasStickyNav = /sticky|fixed.*top|position:\s*sticky|position:\s*fixed/i.test(content);
  if (hasStickyNav) {
    checks.push({ name: "Sticky navbar", nameAr: "شريط تنقل ثابت", passed: true, severity: "info", message: "Navbar is sticky/fixed — good for UX", messageAr: "شريط التنقل ثابت — جيد لتجربة المستخدم" });
  } else {
    checks.push({ name: "Sticky navbar", nameAr: "شريط تنقل ثابت", passed: false, severity: "warning", message: "Navbar not sticky. Consider making it fixed for better navigation", messageAr: "شريط التنقل غير ثابت" });
    penalty -= 3;
  }

  const hasFooterLinks = /footer/i.test(content) && /href|link/i.test(content);
  if (hasFooterLinks) {
    checks.push({ name: "Footer with links", nameAr: "تذييل بروابط", passed: true, severity: "info", message: "Footer contains navigation links", messageAr: "التذييل يحتوي روابط تنقل" });
  }

  return penalty;
}

export function getVisualQaPromptForFixer(result: VisualQaResult): string {
  if (result.status === "excellent" || result.status === "good") return "";

  const failedChecks = result.checks.filter(c => !c.passed && c.severity !== "info");
  if (failedChecks.length === 0) return "";

  let prompt = `\n=== VISUAL QA ISSUES TO FIX ===\nVisual Score: ${result.score}/100 (${result.status})\n\n`;
  prompt += `Fix these visual design issues:\n`;
  for (const check of failedChecks) {
    prompt += `- ❌ ${check.name}: ${check.message}`;
    if (check.suggestion) prompt += ` → FIX: ${check.suggestion}`;
    prompt += `\n`;
  }
  prompt += `\n=== END VISUAL QA ===\n`;
  return prompt;
}
