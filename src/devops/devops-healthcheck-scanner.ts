import fs from 'fs';
import type { DevopsCheckItem, DevopsIssue } from './devops-types';
import { walkDevopsFiles } from './devops-file-utils';

type HealthcheckScanResult = {
  issues: DevopsIssue[];
  checks: DevopsCheckItem[];
};

const SEARCH_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
]);

export class DevopsHealthcheckScanner {
  async scan(projectPath: string): Promise<HealthcheckScanResult> {
    const issues: DevopsIssue[] = [];
    const checks: DevopsCheckItem[] = [];

    const files = walkDevopsFiles(projectPath, SEARCH_EXTENSIONS);

    let foundHealthEndpoint = false;
    let foundRootFastHandler = false;
    let healthFilePath: string | undefined;
    let healthLine: number | undefined;

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];

        if (
          /\/api\/health|\/health\b|healthcheck/i.test(line) &&
          /(app|get|router\.get|fastify\.get|server\.get)/i.test(line)
        ) {
          foundHealthEndpoint = true;
          healthFilePath = filePath;
          healthLine = i + 1;
        }

        if (
          /['"`]\/['"`]/.test(line) &&
          /(app|get|router\.get|fastify\.get|server\.get)/i.test(line)
        ) {
          foundRootFastHandler = true;
        }
      }
    }

    checks.push({
      key: 'health.endpoint',
      label: 'Health endpoint',
      status: foundHealthEndpoint ? 'pass' : 'fail',
      note: foundHealthEndpoint ? 'موجود' : 'غير موجود',
    });

    if (!foundHealthEndpoint) {
      issues.push({
        id: 'devops:health:missing-health-endpoint',
        type: 'healthcheck',
        severity: 'high',
        title: 'Health endpoint is missing',
        description: 'لم يتم العثور على endpoint واضح للصحة مثل /api/health أو /health.',
        recommendation: 'أضف endpoint سريع يعيد 200 بدون عمليات ثقيلة.',
        rule: 'health-endpoint',
      });
    }

    checks.push({
      key: 'health.root-handler',
      label: 'Root route handler',
      status: foundRootFastHandler ? 'pass' : 'warn',
      note: foundRootFastHandler ? 'موجود' : 'غير واضح',
    });

    if (foundHealthEndpoint) {
      checks.push({
        key: 'health.endpoint-location',
        label: 'Health endpoint location',
        status: 'info',
        note: `${healthFilePath ?? 'unknown'}${healthLine ? `:${healthLine}` : ''}`,
      });
    }

    return { issues, checks };
  }
}
