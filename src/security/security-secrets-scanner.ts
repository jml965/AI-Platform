import fs from 'fs';
import { SecurityIssue } from './security-types';
import { walkFiles, isTestLikePath } from './security-file-utils';

const TEXT_FILE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.env', '.yml', '.yaml',
  '.md', '.txt', '.html', '.css', '.scss', '.sh'
]);

const DUMMY_VALUES = new Set([
  'admin123', 'password123', 'test123', 'demo123', 'example123',
  'changeme', 'dummy', 'sample', 'mock', 'test', 'example',
  'password', 'secret', 'placeholder', 'your-secret-here',
  'your-api-key', 'xxx', 'yyy', 'zzz', 'foobar', 'foo', 'bar',
  'string>1', 'string', 'validpassword', 'invalidpassword',
  'invalid-password', 'validPassword'
]);

const PRODUCTION_PATH_SEGMENTS = new Set([
  'src', 'server', 'client', 'lib', 'config', 'api', 'routes',
  'services', 'middleware', 'utils', 'helpers', 'controllers'
]);

const SECRET_RULES: Array<{
  name: string;
  regex: RegExp;
  severity: SecurityIssue['severity'];
  recommendation: string;
  requiresProductionContext: boolean;
}> = [
  {
    name: 'OpenAI API Key',
    regex: /sk-[A-Za-z0-9]{20,}/g,
    severity: 'critical',
    recommendation: 'انقل المفتاح إلى متغيرات البيئة ولا تضعه داخل الملفات.',
    requiresProductionContext: false
  },
  {
    name: 'AWS Access Key',
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
    recommendation: 'احذف المفتاح من الكود ودوّر المفاتيح فورًا.',
    requiresProductionContext: false
  },
  {
    name: 'Generic private key',
    regex: /-----BEGIN (RSA|EC|DSA|OPENSSH|PRIVATE KEY)[\s\S]*?-----END (RSA|EC|DSA|OPENSSH|PRIVATE KEY)-----/g,
    severity: 'critical',
    recommendation: 'لا تحفظ المفاتيح الخاصة داخل المشروع.',
    requiresProductionContext: false
  },
  {
    name: 'JWT-like secret assignment',
    regex: /(jwt|secret|token|api[_-]?key|password)\s*[:=]\s*['"`][^'"`\n]{8,}['"`]/gi,
    severity: 'high',
    recommendation: 'انقل القيم الحساسة إلى .env أو secret manager.',
    requiresProductionContext: true
  }
];

function isProductionPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.endsWith('.env')) return true;
  const segments = normalized.split('/');
  return segments.some(seg => PRODUCTION_PATH_SEGMENTS.has(seg));
}

function extractSecretValue(line: string): string {
  const match = line.match(/[:=]\s*['"`]([^'"`\n]*)['"`]/);
  return match ? match[1].trim().toLowerCase() : '';
}

function isDummyValue(value: string): boolean {
  if (DUMMY_VALUES.has(value)) return true;
  if (value.length < 8) return true;
  if (/^[a-z]+$/.test(value) && value.length < 12) return true;
  return false;
}

export class SecuritySecretsScanner {
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

      for (const rule of SECRET_RULES) {
        if (rule.requiresProductionContext) {
          if (isTestLikePath(filePath) && !isProductionPath(filePath)) {
            continue;
          }
        }

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (rule.regex.test(line)) {
            if (rule.name === 'JWT-like secret assignment') {
              const secretVal = extractSecretValue(line);
              if (isDummyValue(secretVal)) {
                rule.regex.lastIndex = 0;
                continue;
              }
              if (!isProductionPath(filePath)) {
                rule.regex.lastIndex = 0;
                continue;
              }
            }

            issues.push({
              id: `secret:${filePath}:${i + 1}:${rule.name}`,
              type: 'secret',
              severity: rule.severity,
              title: `Potential secret detected: ${rule.name}`,
              description: line.trim().slice(0, 180),
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
