import fs from 'fs';
import path from 'path';

const IGNORE_DIRS = new Set([
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

export function readIfExists(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

export function findExisting(projectPath: string, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const fullPath = path.join(projectPath, candidate);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

export function walkFiles(
  dir: string,
  allowedExtensions: Set<string>,
  files: string[] = []
): string[] {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkFiles(fullPath, allowedExtensions, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (allowedExtensions.has(ext) || allowedExtensions.has(entry.name.toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}
