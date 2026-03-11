import fs from 'fs';
import path from 'path';
import { SecurityIssue } from './security-types';
import { walkFiles } from './security-file-utils';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const RISKY_PACKAGES: Record<
  string,
  {
    severity: SecurityIssue['severity'];
    note: string;
    recommendation: string;
    canDowngradeWithHardening?: boolean;
  }
> = {
  'node-serialize': {
    severity: 'critical',
    note: 'حزمة معروفة بمخاطر أمنية عالية.',
    recommendation: 'أزل الحزمة واستبدلها بمكتبة آمنة.'
  },
  'serialize-javascript': {
    severity: 'high',
    note: 'راجع النسخة المستخدمة لأن الإصدارات القديمة تعرضت لثغرات XSS.',
    recommendation: 'حدّث الحزمة إلى آخر إصدار آمن.'
  },
  'lodash': {
    severity: 'medium',
    note: 'الإصدارات القديمة من lodash احتوت عدة ثغرات.',
    recommendation: 'تأكد من استخدام إصدار حديث وآمن.'
  },
  'axios': {
    severity: 'medium',
    note: 'بعض الإصدارات القديمة احتوت مشاكل أمنية.',
    recommendation: 'تحقق من الإصدار وحدّثه عند الحاجة.'
  },
  'express': {
    severity: 'low',
    note: 'يجب التأكد من استخدام إصدار حديث مع middlewares أمان مناسبة.',
    recommendation: 'حدّث express واستخدم helmet ومحددات الإدخال.',
    canDowngradeWithHardening: true
  },
  'jsonwebtoken': {
    severity: 'medium',
    note: 'راجع الإصدارات القديمة وإعدادات التحقق من الخوارزمية.',
    recommendation: 'ثبّت الإعدادات الآمنة واستخدم إصدار حديث.'
  }
};

function findPackageJson(projectPath: string): string | null {
  const direct = path.join(projectPath, 'package.json');
  return fs.existsSync(direct) ? direct : null;
}

function normalizeVersion(input?: string): string {
  if (!input) return '';
  return input.replace(/^[\^~><=\s]+/, '').trim();
}

const HARDENING_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

function detectExpressHardening(projectPath: string): boolean {
  const files = walkFiles(projectPath, HARDENING_EXTENSIONS);
  let hasDisablePoweredBy = false;
  let hasSecurityHeaders = false;

  for (const filePath of files) {
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    if (/disable\s*\(\s*['"]x-powered-by['"]\s*\)/.test(content)) {
      hasDisablePoweredBy = true;
    }
    if (/securityHttpHeaders|X-Content-Type-Options|Content-Security-Policy/.test(content)) {
      hasSecurityHeaders = true;
    }

    if (hasDisablePoweredBy && hasSecurityHeaders) return true;
  }

  return hasDisablePoweredBy && hasSecurityHeaders;
}

export class SecurityDependencyScanner {
  async scan(projectPath: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const packageJsonPath = findPackageJson(projectPath);

    if (!packageJsonPath) {
      return issues;
    }

    let packageJson: PackageJson | null = null;

    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
    } catch {
      return [
        {
          id: 'dependency:package-json:parse-failed',
          type: 'dependency',
          severity: 'medium',
          title: 'Could not parse package.json',
          description: 'تعذر قراءة أو تحليل package.json',
          filePath: packageJsonPath,
          recommendation: 'تحقق من صحة صيغة package.json'
        }
      ];
    }

    const deps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {})
    };

    const expressHardened = deps['express'] ? detectExpressHardening(projectPath) : false;

    for (const [name, version] of Object.entries(deps)) {
      const risky = RISKY_PACKAGES[name];
      if (!risky) continue;

      let severity = risky.severity;
      let note = risky.note;

      if (name === 'express' && risky.canDowngradeWithHardening && expressHardened) {
        severity = 'info';
        note = 'express مع hardening أمني مفعّل (x-powered-by disabled + security headers).';
      }

      issues.push({
        id: `dependency:${name}`,
        type: 'dependency',
        severity,
        title: `Dependency requires security review: ${name}`,
        description: `${note} الإصدار الحالي: ${normalizeVersion(version) || version}`,
        filePath: packageJsonPath,
        recommendation: risky.recommendation,
        rule: name
      });
    }

    return issues;
  }
}
