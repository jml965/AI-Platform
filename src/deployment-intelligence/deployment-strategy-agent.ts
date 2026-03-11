import {
  DeploymentPlanStep,
  DeploymentPriority,
  DeploymentRecommendation,
  DeploymentRisk,
  DeploymentTarget
} from './deployment-intelligence-types';
import { DeploymentProfile } from './deployment-project-profiler';

function buildRationale(profile: DeploymentProfile, target: DeploymentTarget): string[] {
  const reasons: string[] = [];

  reasons.push(`Detected project type: ${profile.projectType}.`);

  if (profile.detectedPorts.length) {
    reasons.push(`Detected ports: ${profile.detectedPorts.join(', ')}.`);
  }

  if (profile.healthcheckPath) {
    reasons.push(`Detected health endpoint: ${profile.healthcheckPath}.`);
  }

  if (target === 'vps-docker-nginx') {
    reasons.push('Project appears suitable for containerized deployment with reverse proxy control.');
  }

  if (target === 'cloud-run') {
    reasons.push('Project appears compatible with stateless container hosting.');
  }

  if (target === 'vercel' || target === 'netlify') {
    reasons.push('Project appears suitable for frontend/static deployment workflow.');
  }

  return reasons;
}

function buildRisks(profile: DeploymentProfile, target: DeploymentTarget): DeploymentRisk[] {
  const risks: DeploymentRisk[] = [];

  if (!profile.healthcheckPath) {
    risks.push({
      id: 'deploy-risk:missing-healthcheck',
      severity: 'medium',
      title: 'Health check path not clearly detected',
      description: 'عدم اكتشاف health endpoint واضح قد يصعب مراقبة التشغيل.',
      recommendation: 'أضف endpoint مثل /api/health أو /health.'
    });
  }

  if (!profile.detectedPorts.length && (target === 'cloud-run' || target === 'vps-docker-nginx')) {
    risks.push({
      id: 'deploy-risk:missing-port',
      severity: 'medium',
      title: 'Runtime port not clearly detected',
      description: 'لم يتم اكتشاف منفذ تشغيل واضح للمشروع.',
      recommendation: 'ثبّت PORT واضح داخل .env.example وبيئة التشغيل.'
    });
  }

  if (!profile.startupCommand) {
    risks.push({
      id: 'deploy-risk:missing-start-command',
      severity: 'high',
      title: 'Startup command not clearly detected',
      description: 'لم يتم اكتشاف أمر start واضح من package.json.',
      recommendation: 'أضف script تشغيل واضح مثل npm run start.'
    });
  }

  return risks;
}

function buildSteps(
  target: DeploymentTarget,
  profile: DeploymentProfile,
  priority: DeploymentPriority
): DeploymentPlanStep[] {
  const port = profile.detectedPorts[0] ?? 3000;

  const shared: DeploymentPlanStep[] = [
    {
      order: 1,
      title: 'Validate environment variables',
      description: `راجع متغيرات البيئة المطلوبة وحدد PORT=${port} والقيم الحساسة في مزود الأسرار.`
    },
    {
      order: 2,
      title: 'Run production build',
      description: 'شغّل build إنتاجي وتحقق أن startup command يعمل بدون أخطاء.'
    }
  ];

  if (target === 'vps-docker-nginx') {
    return [
      ...shared,
      {
        order: 3,
        title: 'Build Docker image',
        description: 'ابنِ صورة Docker نهائية للمشروع مع تثبيت نسخة Node ثابتة.'
      },
      {
        order: 4,
        title: 'Run container on VPS',
        description: `شغّل الحاوية على المنفذ ${port} واربطها عبر Nginx reverse proxy.`
      },
      {
        order: 5,
        title: 'Enable health checks and restart policy',
        description: 'فعّل restart policy وراقب endpoint الصحة بعد النشر.'
      }
    ];
  }

  if (target === 'cloud-run') {
    return [
      ...shared,
      {
        order: 3,
        title: 'Build and push container',
        description: 'ارفع صورة Docker إلى registry معتمدة.'
      },
      {
        order: 4,
        title: 'Deploy to Cloud Run',
        description: 'انشر الخدمة كحاوية stateless واضبط PORT وhealth monitoring.'
      },
      {
        order: 5,
        title: 'Verify public endpoint',
        description: 'اختبر endpoint العام وراجع زمن الإقلاع واستهلاك الذاكرة.'
      }
    ];
  }

  if (target === 'vercel' || target === 'netlify') {
    return [
      ...shared,
      {
        order: 3,
        title: 'Connect repository',
        description: 'اربط المستودع مع منصة النشر واضبط build command وoutput directory.'
      },
      {
        order: 4,
        title: 'Set environment variables',
        description: 'أضف متغيرات البيئة المطلوبة داخل إعدادات المنصة.'
      },
      {
        order: 5,
        title: 'Deploy and verify frontend routes',
        description: 'اختبر الصفحات، الـ assets، والـ API routes إن وجدت.'
      }
    ];
  }

  return [
    ...shared,
    {
      order: 3,
      title: 'Prepare runtime',
      description: `جهّز بيئة التشغيل المناسبة بحسب أولوية ${priority}.`
    },
    {
      order: 4,
      title: 'Deploy application',
      description: 'انشر المشروع إلى الهدف المقترح واختبر readiness بعد النشر.'
    }
  ];
}

export class DeploymentStrategyAgent {
  recommend(profile: DeploymentProfile): DeploymentRecommendation {
    let recommendedTarget: DeploymentTarget = 'unknown';
    let fallbackTarget: DeploymentTarget = 'unknown';
    let priority: DeploymentPriority = 'simplest-ops';

    switch (profile.projectType) {
      case 'static-site':
        recommendedTarget = 'netlify';
        fallbackTarget = 'vercel';
        priority = 'fastest-launch';
        break;
      case 'spa':
        recommendedTarget = 'vercel';
        fallbackTarget = 'netlify';
        priority = 'fastest-launch';
        break;
      case 'node-api':
        recommendedTarget = 'cloud-run';
        fallbackTarget = 'vps-docker-nginx';
        priority = 'simplest-ops';
        break;
      case 'fullstack-node':
        recommendedTarget = 'vps-docker-nginx';
        fallbackTarget = 'cloud-run';
        priority = 'best-control';
        break;
      default:
        recommendedTarget = 'vps-docker-nginx';
        fallbackTarget = 'render';
        priority = 'best-control';
        break;
    }

    return {
      projectType: profile.projectType,
      recommendedTarget,
      fallbackTarget,
      priority,
      rationale: buildRationale(profile, recommendedTarget),
      signals: profile.signals,
      risks: buildRisks(profile, recommendedTarget),
      steps: buildSteps(recommendedTarget, profile, priority),
      environmentKeys: profile.environmentKeys,
      ports: profile.detectedPorts,
      startupCommand: profile.startupCommand,
      healthcheckPath: profile.healthcheckPath,
      generatedAt: new Date().toISOString()
    };
  }
}
