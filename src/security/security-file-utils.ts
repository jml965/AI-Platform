import fs from 'fs';
import path from 'path';

export const SECURITY_IGNORE_DIRS = new Set([
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

const TEST_LIKE_SEGMENTS = new Set([
  'test',
  'tests',
  '__tests__',
  'fixtures',
  'mocks',
  'mock',
  'examples',
  'example',
  'demo',
  'samples',
  'sample',
  'generated'
]);

export function shouldIgnoreDir(dirName: string): boolean {
  return SECURITY_IGNORE_DIRS.has(dirName);
}

export function isIgnoredPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  return segments.some(seg => SECURITY_IGNORE_DIRS.has(seg));
}

export function isTestLikePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  return segments.some(seg => TEST_LIKE_SEGMENTS.has(seg));
}

export function walkFiles(
  dir: string,
  allowedExtensions: Set<string>,
  files: string[] = []
): string[] {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (shouldIgnoreDir(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkFiles(fullPath, allowedExtensions, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (allowedExtensions.has(ext) || entry.name === '.env') {
      files.push(fullPath);
    }
  }

  return files;
}
