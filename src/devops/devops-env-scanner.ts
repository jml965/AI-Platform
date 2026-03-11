import fs from 'fs';
import path from 'path';
import type { DevopsCheckItem, DevopsIssue } from './devops-types';
import { findFirstExisting } from './devops-file-utils';

type EnvScanResult = {
  issues: DevopsIssue[];
  checks: DevopsCheckItem[];
};

const REQUIRED_ENV_KEYS = ['PORT'];

export class DevopsEnvScanner {
  async scan(projectPath: string): Promise<EnvScanResult> {
    const issues: DevopsIssue[] = [];
    const checks: DevopsCheckItem[] = [];

    const envExamplePath = findFirstExisting(projectPath, [
      '.env.example',
      '.env.sample',
      '.env.template',
    ]);

    if (!envExamplePath) {
      issues.push({
        id: 'devops:env:missing-example',
        type: 'env',
        severity: 'medium',
        title: 'Environment example file is missing',
        description: 'لا يوجد ملف env example يوضح المتغيرات المطلوبة.',
        recommendation: 'أضف .env.example أو .env.sample لتوضيح إعدادات التشغيل.',
        rule: 'env-example',
      });

      checks.push({
        key: 'env.example',
        label: 'Environment example file',
        status: 'warn',
        note: 'غير موجود',
      });
    } else {
      checks.push({
        key: 'env.example',
        label: 'Environment example file',
        status: 'pass',
        note: path.basename(envExamplePath),
      });

      const content = fs.readFileSync(envExamplePath, 'utf8');

      for (const key of REQUIRED_ENV_KEYS) {
        const exists = new RegExp(`^\\s*${key}\\s*=`, 'm').test(content);
        checks.push({
          key: `env.key.${key}`,
          label: `Required key: ${key}`,
          status: exists ? 'pass' : 'warn',
          note: exists ? 'موجود' : 'غير موجود',
        });

        if (!exists) {
          issues.push({
            id: `devops:env:missing-key:${key}`,
            type: 'env',
            severity: 'low',
            title: `Missing recommended env key: ${key}`,
            description: `ملف env example لا يحتوي على ${key}.`,
            filePath: envExamplePath,
            recommendation: `أضف ${key} إلى ملف env example إذا كان التطبيق يعتمد عليه.`,
            rule: `env-required-${key}`,
          });
        }
      }
    }

    const envPath = path.join(projectPath, '.env');
    if (fs.existsSync(envPath)) {
      checks.push({
        key: 'env.local-present',
        label: '.env present',
        status: 'info',
        note: 'موجود محليًا',
      });
    } else {
      checks.push({
        key: 'env.local-present',
        label: '.env present',
        status: 'info',
        note: 'غير موجود محليًا',
      });
    }

    return { issues, checks };
  }
}
