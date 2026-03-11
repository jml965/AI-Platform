import { SecurityHeaderCheck, SecurityIssue } from './security-types';

const REQUIRED_HEADERS: Array<{
  name: string;
  recommendedValue?: string;
  severity: SecurityIssue['severity'];
  note: string;
}> = [
  {
    name: 'X-Content-Type-Options',
    recommendedValue: 'nosniff',
    severity: 'medium',
    note: 'يمنع MIME sniffing.'
  },
  {
    name: 'X-Frame-Options',
    recommendedValue: 'DENY',
    severity: 'medium',
    note: 'يقلل مخاطر clickjacking.'
  },
  {
    name: 'Referrer-Policy',
    recommendedValue: 'strict-origin-when-cross-origin',
    severity: 'low',
    note: 'يحسن حماية معلومات الإحالة.'
  },
  {
    name: 'Content-Security-Policy',
    recommendedValue: "default-src 'self';",
    severity: 'high',
    note: 'من أهم الرؤوس لتخفيف XSS.'
  },
  {
    name: 'Permissions-Policy',
    recommendedValue: 'camera=(), microphone=(), geolocation=()',
    severity: 'low',
    note: 'يقيد ميزات المتصفح.'
  }
];

export class SecurityHeadersEvaluator {
  evaluate(projectText: string): {
    headers: SecurityHeaderCheck[];
    issues: SecurityIssue[];
  } {
    const headers: SecurityHeaderCheck[] = [];
    const issues: SecurityIssue[] = [];

    for (const header of REQUIRED_HEADERS) {
      const found = projectText.toLowerCase().includes(header.name.toLowerCase());
      headers.push({
        name: header.name,
        status: found ? 'present' : 'missing',
        recommendedValue: header.recommendedValue,
        severity: header.severity,
        note: header.note
      });

      if (!found) {
        issues.push({
          id: `header:${header.name}`,
          type: 'header',
          severity: header.severity,
          title: `Missing security header: ${header.name}`,
          description: header.note,
          recommendation: header.recommendedValue
            ? `أضف الرأس ${header.name} بالقيمة المقترحة: ${header.recommendedValue}`
            : `أضف الرأس ${header.name}`,
          rule: header.name
        });
      }
    }

    return { headers, issues };
  }
}
