import type { ProductIntentResult, ProductIntentType } from "./product-intent-types";

function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function scoreIntent(prompt: string): Array<{ type: ProductIntentType; score: number; signals: string[] }> {
  const text = prompt.toLowerCase();

  const rules: Array<{
    type: ProductIntentType;
    keywords: string[];
  }> = [
    {
      type: "auction-platform",
      keywords: ["auction", "bidding", "bid", "مزاد", "مزايدة", "مزادات"],
    },
    {
      type: "marketplace",
      keywords: ["marketplace", "multi vendor", "متجر متعدد", "سوق", "بيع وشراء", "متجر"],
    },
    {
      type: "dashboard",
      keywords: ["dashboard", "analytics", "kpi", "لوحة تحكم", "إحصائيات", "مؤشرات"],
    },
    {
      type: "admin-panel",
      keywords: ["admin", "cms", "control panel", "إدارة", "لوحة إدارة", "صلاحيات"],
    },
    {
      type: "saas-app",
      keywords: ["saas", "subscription", "workspace", "منصة", "اشتراك", "خدمة"],
    },
    {
      type: "crud-app",
      keywords: ["crud", "form", "table", "records", "إدخال", "سجلات", "نموذج", "جدول"],
    },
    {
      type: "content-site",
      keywords: ["blog", "news", "article", "magazine", "مدونة", "أخبار", "مقالات"],
    },
    {
      type: "portfolio",
      keywords: ["portfolio", "personal", "resume", "أعمالي", "معرض أعمال", "سيرة ذاتية"],
    },
    {
      type: "landing-page",
      keywords: ["landing", "hero", "cta", "landing page", "صفحة هبوط", "صفحة تعريفية"],
    },
    {
      type: "business-website",
      keywords: ["company", "business", "corporate", "agency", "شركة", "مؤسسة", "وكالة", "معرض"],
    },
  ];

  const results = rules.map((rule) => {
    const matched = rule.keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
    return {
      type: rule.type,
      score: matched.length,
      signals: matched,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}

export class ProductIntentClassifier {
  classify(prompt: string): ProductIntentResult {
    const ranked = scoreIntent(prompt);
    const top = ranked[0];

    const language = hasArabic(prompt) ? "ar" : "en";
    const rtl = language === "ar";

    if (!top || top.score === 0) {
      return {
        type: "general-web-app",
        confidence: 0.45,
        signals: [],
        rtl,
        language,
      };
    }

    return {
      type: top.type,
      confidence: Math.min(0.95, 0.5 + top.score * 0.12),
      signals: top.signals,
      rtl,
      language,
    };
  }
}
