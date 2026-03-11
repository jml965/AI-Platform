import { getSecurityAiProvider } from "../llm/provider-factory";
import type { SecurityIssue, SecurityScanResult } from "./security-types";

export interface SecurityAiAnalysis {
  enhancedIssues: Array<{
    original: string;
    severity: string;
    explanation: string;
    fixSuggestion: string;
    priority: number;
  }>;
  overallRiskLevel: string;
  summary: string;
  recommendations: string[];
  aiModel: string;
}

export async function analyzeSecurityWithAI(
  scanResult: SecurityScanResult
): Promise<SecurityAiAnalysis | null> {
  const provider = getSecurityAiProvider();
  if (!provider.isConfigured()) return null;

  const issuesSummary = scanResult.issues.slice(0, 20).map((issue: SecurityIssue) => ({
    type: issue.type,
    severity: issue.severity,
    message: issue.message,
    filePath: issue.filePath,
  }));

  try {
    const result = await provider.generate({
      messages: [
        {
          role: "system" as const,
          content: [
            "You are a senior application security expert.",
            "You receive the results of an automated security scan of a web project.",
            "Analyze each issue, explain the real-world risk, and provide specific fix suggestions.",
            "Return only valid JSON.",
            "JSON shape:",
            "{",
            '  "enhancedIssues": [',
            "    {",
            '      "original": "original issue message",',
            '      "severity": "critical|high|medium|low|info",',
            '      "explanation": "why this is dangerous in plain language",',
            '      "fixSuggestion": "specific code or config fix",',
            '      "priority": 1',
            "    }",
            "  ],",
            '  "overallRiskLevel": "critical|high|medium|low|safe",',
            '  "summary": "overall security assessment in Arabic",',
            '  "recommendations": ["recommendation 1", "recommendation 2"]',
            "}",
            "Rules:",
            "- Prioritize issues by real-world exploitability",
            "- Write explanations and summary in Arabic",
            "- Be specific with fix suggestions — include code snippets when helpful",
            "- no markdown, no explanation outside JSON",
          ].join("\n"),
        },
        {
          role: "user" as const,
          content: JSON.stringify({
            score: scanResult.score,
            grade: scanResult.grade,
            totalIssues: scanResult.issues.length,
            issues: issuesSummary,
            headers: scanResult.headers,
          }, null, 2),
        },
      ],
      maxTokens: 4000,
      temperature: 0.1,
      jsonMode: false,
    });

    if (!result.ok || !result.text) return null;

    let textToParse = result.text;
    const jsonMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) textToParse = jsonMatch[1].trim();

    const parsed = JSON.parse(textToParse);

    return {
      enhancedIssues: Array.isArray(parsed.enhancedIssues) ? parsed.enhancedIssues : [],
      overallRiskLevel: parsed.overallRiskLevel || "medium",
      summary: parsed.summary || "",
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      aiModel: "claude-sonnet-4",
    };
  } catch {
    return null;
  }
}
