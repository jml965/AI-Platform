import fs from 'fs';
import { SecurityIssue } from './security-types';
import { walkFiles } from './security-file-utils';

const TEXT_FILE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.html'
]);

const XSS_RULES: Array<{
  name: string;
  regex: RegExp;
  severity: SecurityIssue['severity'];
  recommendation: string;
}> = [
  {
    name: 'dangerouslySetInnerHTML',
    regex: /dangerouslySetInnerHTML\s*=\s*\{\s*\{[\s\S]*?\}\s*\}/g,
    severity: 'high',
    recommendation: 'تجنب dangerouslySetInnerHTML أو قم بتطهير المحتوى باستخدام sanitizer.'
  },
  {
    name: 'innerHTML assignment',
    regex: /\.innerHTML\s*=/g,
    severity: 'high',
    recommendation: 'استخدم textContent أو قم بتطهير المحتوى قبل الحقن.'
  },
  {
    name: 'outerHTML assignment',
    regex: /\.outerHTML\s*=/g,
    severity: 'high',
    recommendation: 'تجنب outerHTML واستبدله بعمليات DOM آمنة.'
  },
  {
    name: 'document.write usage',
    regex: /document\.write\s*\(/g,
    severity: 'medium',
    recommendation: 'تجنب document.write لأنه قد يفتح باب XSS.'
  },
  {
    name: 'insertAdjacentHTML usage',
    regex: /insertAdjacentHTML\s*\(/g,
    severity: 'medium',
    recommendation: 'لا تمرر HTML خام من مصادر غير موثوقة.'
  }
];

export class SecurityXssScanner {
  async scan(projectPath: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const files = walkFiles(projectPath, TEXT_FILE_EXTENSIONS);

    for (const filePath of files) {
      let content = '';
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split(/\r?\n/);

      for (const rule of XSS_RULES) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (rule.regex.test(line)) {
            issues.push({
              id: `xss:${filePath}:${i + 1}:${rule.name}`,
              type: 'xss',
              severity: rule.severity,
              title: `Potential XSS pattern detected: ${rule.name}`,
              description: line.trim().slice(0, 220),
              filePath,
              line: i + 1,
              recommendation: rule.recommendation,
              rule: rule.name
            });
          }

          rule.regex.lastIndex = 0;
        }
      }
    }

    return issues;
  }
}
