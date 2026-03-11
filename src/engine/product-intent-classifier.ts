import type { ProductIntentResult, ProductIntentType } from "./product-intent-types";
import { getIntentProvider } from "../llm/provider-factory";

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

async function classifyWithAI(prompt: string, language: "ar" | "en"): Promise<ProductIntentResult | null> {
  const provider = getIntentProvider();
  if (!provider.isConfigured()) return null;

  try {
    const result = await provider.generate({
      messages: [
        {
          role: "system" as const,
          content: [
            "You are a project intent classifier. Analyze the user's request and determine the type of project they want to build.",
            "Return only valid JSON.",
            "JSON shape:",
            "{",
            '  "type": "one of: landing-page, business-website, dashboard, admin-panel, marketplace, auction-platform, saas-app, crud-app, content-site, portfolio, general-web-app",',
            '  "confidence": 0.0 to 1.0,',
            '  "signals": ["keyword1", "keyword2"]',
            "}",
            "Rules:",
            "- Analyze the full meaning, not just keywords",
            "- Consider context and implied features",
            "- Return confidence based on how clear the intent is",
            "- no markdown, no explanation outside JSON",
          ].join("\n"),
        },
        {
          role: "user" as const,
          content: prompt,
        },
      ],
      maxTokens: 500,
      temperature: 0.1,
      jsonMode: false,
    });

    if (!result.ok || !result.text) return null;

    let textToParse = result.text;
    const jsonMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) textToParse = jsonMatch[1].trim();

    const parsed = JSON.parse(textToParse);
    const rtl = language === "ar";

    return {
      type: parsed.type || "general-web-app",
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      rtl,
      language,
      aiClassified: true,
      aiModel: "gpt-5.2",
    } as ProductIntentResult;
  } catch {
    return null;
  }
}

export class ProductIntentClassifier {
  async classify(prompt: string): Promise<ProductIntentResult> {
    const language = hasArabic(prompt) ? "ar" : "en";
    const rtl = language === "ar";

    const ranked = scoreIntent(prompt);
    const top = ranked[0];

    if (top && top.score >= 2) {
      return {
        type: top.type,
        confidence: Math.min(0.95, 0.5 + top.score * 0.12),
        signals: top.signals,
        rtl,
        language,
      };
    }

    const aiResult = await classifyWithAI(prompt, language);
    if (aiResult) {
      return aiResult;
    }

    if (top && top.score === 1) {
      return {
        type: top.type,
        confidence: 0.55,
        signals: top.signals,
        rtl,
        language,
      };
    }

    return {
      type: "general-web-app",
      confidence: 0.45,
      signals: [],
      rtl,
      language,
    };
  }
}
