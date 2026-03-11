import fs from 'fs';
import path from 'path';

export const DEVOPS_IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '.cache',
  '.ai-runs',
  '.replit',
  '.local',
  '.upm',
  '.config',
  'tmp',
  'temp'
]);

export function isIgnoredDevopsPath(filePath: string): boolean {
  const normalized = path.resolve(filePath);
  const parts = normalized.split(path.sep).filter(Boolean);
  return parts.some((part) => DEVOPS_IGNORE_DIRS.has(part));
}

export function walkDevopsFiles(
  dir: string,
  allowedExtensions: Set<string>,
  files: string[] = []
): string[] {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (DEVOPS_IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDevopsFiles(fullPath, allowedExtensions, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (allowedExtensions.has(ext) || allowedExtensions.has(entry.name.toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

export function findFirstExisting(projectPath: string, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const fullPath = path.join(projectPath, candidate);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}
