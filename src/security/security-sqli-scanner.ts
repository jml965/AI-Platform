import fs from 'fs';
import path from 'path';
import { SecurityIssue } from './security-types';
import { walkFiles } from './security-file-utils';

const TEXT_FILE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx'
]);

const SELF_EXCLUDE_FILES = new Set([
  'security-sqli-scanner.ts',
  'security-sqli-scanner.js'
]);

const SQL_KEYWORDS = [
  'SELECT', 'INSERT INTO', 'UPDATE', 'DELETE FROM',
  'WHERE', 'FROM', 'JOIN', 'ORDER BY', 'GROUP BY',
  'LIMIT', 'VALUES', 'SET', 'CREATE TABLE', 'ALTER TABLE',
  'DROP TABLE', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
  'HAVING', 'UNION', 'DISTINCT'
];

const SQL_KEYWORD_PATTERN = '\\b(' + SQL_KEYWORDS.map(k => k.replace(/\s+/g, '\\s+')).join('|') + ')\\b';
const SQL_KEYWORD_REGEX = new RegExp(SQL_KEYWORD_PATTERN, 'i');

function isSqlLikeText(input: string): boolean {
  return SQL_KEYWORD_REGEX.test(input);
}

function hasTemplateInterpolation(input: string): boolean {
  return /\$\{[^}]+\}/.test(input);
}

function hasStringConcatenation(input: string): boolean {
  return /['"`]\s*\+|\+\s*['"`]/.test(input);
}

function isParameterizedQuery(input: string): boolean {
  return /\?\s*[,)\]]|\$\d+|:\w+|%s/.test(input);
}

function getMultiLineContext(lines: string[], index: number, range: number): string {
  const start = Math.max(0, index - range);
  const end = Math.min(lines.length - 1, index + range);
  return lines.slice(start, end + 1).join('\n');
}

export class SecuritySqliScanner {
  async scan(projectPath: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const files = walkFiles(projectPath, TEXT_FILE_EXTENSIONS);

    for (const filePath of files) {
      if (SELF_EXCLUDE_FILES.has(path.basename(filePath))) continue;

      let content = '';
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const context = getMultiLineContext(lines, i, 2);

        if (isSqlLikeText(line) && hasTemplateInterpolation(line)) {
          if (!isParameterizedQuery(context)) {
            issues.push({
              id: `sqli:${filePath}:${i + 1}:unsafe-interpolation`,
              type: 'sqli',
              severity: 'high',
              title: 'Unsafe dynamic SQL interpolation detected',
              description: line.trim().slice(0, 220),
              filePath,
              line: i + 1,
              recommendation: 'استخدم parameterized queries بدل template literals داخل استعلامات SQL.',
              rule: 'unsafe-sql-interpolation'
            });
          }
          continue;
        }

        if (isSqlLikeText(line) && hasStringConcatenation(line)) {
          if (!isParameterizedQuery(context)) {
            issues.push({
              id: `sqli:${filePath}:${i + 1}:unsafe-concatenation`,
              type: 'sqli',
              severity: 'high',
              title: 'Potential SQL concatenation in raw query',
              description: line.trim().slice(0, 220),
              filePath,
              line: i + 1,
              recommendation: 'امنع concatenation في SQL واستخدم placeholders.',
              rule: 'unsafe-sql-concatenation'
            });
          }
          continue;
        }

        if (/\.(query|execute)\s*\(/.test(line)) {
          if (isSqlLikeText(context) && hasTemplateInterpolation(context) && !isParameterizedQuery(context)) {
            issues.push({
              id: `sqli:${filePath}:${i + 1}:raw-query-dynamic`,
              type: 'sqli',
              severity: 'medium',
              title: 'Raw query with dynamic input detected; review parameterization',
              description: line.trim().slice(0, 220),
              filePath,
              line: i + 1,
              recommendation: 'تأكد من أن المدخلات الديناميكية تمر عبر bind/replacements.',
              rule: 'raw-query-dynamic-input'
            });
          } else if (isSqlLikeText(context) && hasStringConcatenation(context) && !isParameterizedQuery(context)) {
            issues.push({
              id: `sqli:${filePath}:${i + 1}:raw-query-concat`,
              type: 'sqli',
              severity: 'medium',
              title: 'Raw query with string concatenation; review parameterization',
              description: line.trim().slice(0, 220),
              filePath,
              line: i + 1,
              recommendation: 'تأكد من أن الاستعلام لا يحتوي على دمج مباشر للمدخلات.',
              rule: 'raw-query-concatenation'
            });
          }
        }

        if (/sequelize\.literal\s*\(/.test(line)) {
          if (hasTemplateInterpolation(context) || hasStringConcatenation(context)) {
            issues.push({
              id: `sqli:${filePath}:${i + 1}:sequelize-literal`,
              type: 'sqli',
              severity: 'medium',
              title: 'sequelize.literal with dynamic content',
              description: line.trim().slice(0, 220),
              filePath,
              line: i + 1,
              recommendation: 'راجع sequelize.literal وتأكد أن أي مدخلات مستخدم غير مدمجة مباشرة.',
              rule: 'sequelize-literal-dynamic'
            });
          }
        }
      }
    }

    return issues;
  }
}
