import fs from 'fs';
import path from 'path';
import type { DevopsCheckItem, DevopsIssue } from './devops-types';
import { findFirstExisting } from './devops-file-utils';

type DockerScanResult = {
  issues: DevopsIssue[];
  checks: DevopsCheckItem[];
};

function lineNumberOf(content: string, pattern: RegExp): number | undefined {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (pattern.test(lines[i])) return i + 1;
    pattern.lastIndex = 0;
  }
  return undefined;
}

export class DevopsDockerScanner {
  async scan(projectPath: string): Promise<DockerScanResult> {
    const issues: DevopsIssue[] = [];
    const checks: DevopsCheckItem[] = [];

    const dockerfilePath = findFirstExisting(projectPath, [
      'Dockerfile',
      'dockerfile',
      'DockerFile'
    ]);

    if (!dockerfilePath) {
      issues.push({
        id: 'devops:docker:missing-dockerfile',
        type: 'docker',
        severity: 'high',
        title: 'Dockerfile is missing',
        description: 'لم يتم العثور على Dockerfile داخل المشروع.',
        recommendation: 'أضف Dockerfile واضحًا لتهيئة بيئة التشغيل والإنتاج.',
        rule: 'missing-dockerfile',
      });

      checks.push({
        key: 'dockerfile.exists',
        label: 'Dockerfile',
        status: 'fail',
        note: 'غير موجود',
      });

      return { issues, checks };
    }

    const content = fs.readFileSync(dockerfilePath, 'utf8');

    checks.push({
      key: 'dockerfile.exists',
      label: 'Dockerfile',
      status: 'pass',
      note: path.basename(dockerfilePath),
    });

    if (!/^\s*FROM\s+/mi.test(content)) {
      issues.push({
        id: 'devops:docker:missing-from',
        type: 'docker',
        severity: 'critical',
        title: 'Dockerfile missing FROM instruction',
        description: 'Dockerfile لا يحتوي على FROM.',
        filePath: dockerfilePath,
        recommendation: 'أضف base image واضحة في أول Dockerfile.',
        rule: 'docker-from',
      });
      checks.push({
        key: 'dockerfile.from',
        label: 'Base image',
        status: 'fail',
        note: 'تعليمة FROM مفقودة',
      });
    } else {
      checks.push({
        key: 'dockerfile.from',
        label: 'Base image',
        status: 'pass',
      });
    }

    const hasExpose = /^\s*EXPOSE\s+\d+/mi.test(content);
    checks.push({
      key: 'dockerfile.expose',
      label: 'EXPOSE port',
      status: hasExpose ? 'pass' : 'warn',
      note: hasExpose ? 'موجود' : 'غير موجود',
    });

    if (!hasExpose) {
      issues.push({
        id: 'devops:docker:missing-expose',
        type: 'port',
        severity: 'low',
        title: 'Dockerfile does not expose a port',
        description: 'لم يتم العثور على EXPOSE داخل Dockerfile.',
        filePath: dockerfilePath,
        recommendation: 'أضف EXPOSE للمنفذ المتوقع للتطبيق.',
        rule: 'docker-expose',
      });
    }

    const hasCmdOrEntrypoint = /^\s*(CMD|ENTRYPOINT)\s+/mi.test(content);
    checks.push({
      key: 'dockerfile.start-command',
      label: 'Startup command',
      status: hasCmdOrEntrypoint ? 'pass' : 'fail',
      note: hasCmdOrEntrypoint ? 'موجود' : 'مفقود',
    });

    if (!hasCmdOrEntrypoint) {
      issues.push({
        id: 'devops:docker:missing-start-command',
        type: 'process',
        severity: 'high',
        title: 'Dockerfile missing CMD or ENTRYPOINT',
        description: 'Dockerfile لا يحتوي على أمر تشغيل نهائي.',
        filePath: dockerfilePath,
        recommendation: 'أضف CMD أو ENTRYPOINT لتشغيل التطبيق.',
        rule: 'docker-start-command',
      });
    }

    const usesNodeLatest = /^\s*FROM\s+node:latest/mi.test(content);
    if (usesNodeLatest) {
      issues.push({
        id: 'devops:docker:node-latest',
        type: 'docker',
        severity: 'medium',
        title: 'Dockerfile uses node:latest',
        description: 'استخدام latest يقلل ثبات بيئة الإنتاج.',
        filePath: dockerfilePath,
        line: lineNumberOf(content, /^\s*FROM\s+node:latest/mi),
        recommendation: 'ثبّت نسخة Node محددة مثل node:20-alpine.',
        rule: 'docker-node-latest',
      });

      checks.push({
        key: 'dockerfile.pinned-base-image',
        label: 'Pinned base image',
        status: 'warn',
        note: 'يستخدم latest',
      });
    } else {
      checks.push({
        key: 'dockerfile.pinned-base-image',
        label: 'Pinned base image',
        status: 'pass',
      });
    }

    const usesProductionEnv = /NODE_ENV\s*=\s*production/i.test(content) || /ENV\s+NODE_ENV\s+production/i.test(content);
    checks.push({
      key: 'dockerfile.node-env-production',
      label: 'Production NODE_ENV',
      status: usesProductionEnv ? 'pass' : 'warn',
      note: usesProductionEnv ? 'موجود' : 'غير ظاهر',
    });

    if (!usesProductionEnv) {
      issues.push({
        id: 'devops:docker:node-env-production',
        type: 'deployment',
        severity: 'low',
        title: 'Production NODE_ENV not explicitly set',
        description: 'لم يظهر تعيين NODE_ENV=production داخل Dockerfile.',
        filePath: dockerfilePath,
        recommendation: 'اضبط NODE_ENV=production في بيئة التشغيل أو Dockerfile.',
        rule: 'docker-node-env-production',
      });
    }

    return { issues, checks };
  }
}
