import path from 'path';
import {
  DeploymentProjectType,
  DeploymentSignal
} from './deployment-intelligence-types';
import { findExisting, readIfExists, walkFiles } from './deployment-intelligence-file-utils';

export interface DeploymentProfile {
  projectType: DeploymentProjectType;
  signals: DeploymentSignal[];
  packageJson: any | null;
  detectedPorts: number[];
  startupCommand?: string;
  healthcheckPath?: string;
  environmentKeys: string[];
}

const SEARCH_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.html',
  '.yml',
  '.yaml'
]);

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function extractEnvKeys(text: string): string[] {
  const matches = text.match(/\b[A-Z][A-Z0-9_]{1,}\b/g) ?? [];
  return uniq(
    matches.filter((key) => !['GET', 'POST', 'PUT', 'DELETE'].includes(key))
  );
}

function detectPortsFromText(text: string): number[] {
  const ports: number[] = [];
  const patterns = [
    /\bPORT\s*=\s*(\d{2,5})\b/g,
    /listen\s*\(\s*(\d{2,5})/g,
    /EXPOSE\s+(\d{2,5})/g,
    /port\s*[:=]\s*(\d{2,5})/gi
  ];

  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const port = Number(match[1]);
      if (!Number.isNaN(port)) ports.push(port);
    }
  }

  return uniq(ports);
}

function detectHealthPath(text: string): string | undefined {
  const patterns = [
    /['"`](\/api\/health)['"`]/,
    /['"`](\/health)['"`]/,
    /['"`](\/healthz)['"`]/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

export class DeploymentProjectProfiler {
  async profile(projectPath: string): Promise<DeploymentProfile> {
    const signals: DeploymentSignal[] = [];

    const packageJsonPath = findExisting(projectPath, ['package.json']);
    const packageJsonText = packageJsonPath ? readIfExists(packageJsonPath) : null;

    let packageJson: any | null = null;
    if (packageJsonText) {
      try {
        packageJson = JSON.parse(packageJsonText);
      } catch {
        packageJson = null;
      }
    }

    const hasDockerfile = !!findExisting(projectPath, ['Dockerfile', 'dockerfile']);
    const hasNextConfig = !!findExisting(projectPath, ['next.config.js', 'next.config.ts']);
    const hasViteConfig = !!findExisting(projectPath, ['vite.config.ts', 'vite.config.js']);
    const hasNetlify = !!findExisting(projectPath, ['netlify.toml']);
    const hasVercel = !!findExisting(projectPath, ['vercel.json']);
    const hasExpressLikeServer = !!findExisting(projectPath, [
      'server/index.ts',
      'server/index.js',
      'server/routes.ts',
      'server/app.ts',
      'src/server.ts'
    ]);

    signals.push(
      { key: 'dockerfile', detected: hasDockerfile },
      { key: 'next-config', detected: hasNextConfig },
      { key: 'vite-config', detected: hasViteConfig },
      { key: 'netlify-config', detected: hasNetlify },
      { key: 'vercel-config', detected: hasVercel },
      { key: 'express-like-server', detected: hasExpressLikeServer }
    );

    const dependencies = {
      ...(packageJson?.dependencies ?? {}),
      ...(packageJson?.devDependencies ?? {})
    };

    const depKeys = Object.keys(dependencies);

    const hasReact = depKeys.includes('react');
    const hasNext = depKeys.includes('next');
    const hasExpress = depKeys.includes('express');
    const hasFastify = depKeys.includes('fastify');
    const hasNest = depKeys.includes('@nestjs/core');

    signals.push(
      { key: 'react', detected: hasReact },
      { key: 'next', detected: hasNext },
      { key: 'express', detected: hasExpress },
      { key: 'fastify', detected: hasFastify },
      { key: 'nestjs', detected: hasNest }
    );

    const files = walkFiles(projectPath, SEARCH_EXTENSIONS);
    let combinedText = '';

    for (const file of files.slice(0, 200)) {
      const content = readIfExists(file);
      if (content) combinedText += `\n// FILE: ${path.relative(projectPath, file)}\n${content}\n`;
    }

    const detectedPorts = detectPortsFromText(combinedText);
    const environmentKeys = uniq(extractEnvKeys(combinedText)).slice(0, 50);
    const healthcheckPath = detectHealthPath(combinedText);

    let startupCommand: string | undefined =
      packageJson?.scripts?.start ||
      packageJson?.scripts?.dev ||
      undefined;

    let projectType: DeploymentProjectType = 'unknown';

    if (hasNext) {
      projectType = hasExpressLikeServer ? 'fullstack-node' : 'spa';
    } else if (hasReact && hasViteConfig && !hasExpressLikeServer) {
      projectType = 'spa';
    } else if ((hasExpress || hasFastify || hasNest || hasExpressLikeServer) && hasReact) {
      projectType = 'fullstack-node';
    } else if (hasExpress || hasFastify || hasNest || hasExpressLikeServer) {
      projectType = 'node-api';
    } else if (findExisting(projectPath, ['index.html']) && !hasExpressLikeServer) {
      projectType = 'static-site';
    }

    return {
      projectType,
      signals,
      packageJson,
      detectedPorts,
      startupCommand,
      healthcheckPath,
      environmentKeys
    };
  }
}
