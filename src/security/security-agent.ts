import fs from 'fs';
import {
  SecurityIssue,
  SecurityScanResult
} from './security-types';
import { SecuritySecretsScanner } from './security-secrets-scanner';
import { SecurityHeadersEvaluator } from './security-headers-evaluator';
import { SecurityScoreCalculator } from './security-score-calculator';
import { SecurityXssScanner } from './security-xss-scanner';
import { SecuritySqliScanner } from './security-sqli-scanner';
import { SecurityDependencyScanner } from './security-dependency-scanner';
import { walkFiles, isIgnoredPath } from './security-file-utils';

const READ_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.scss', '.yml', '.yaml', '.env'
]);

function readProjectText(dir: string): string {
  const files = walkFiles(dir, READ_EXTENSIONS);
  const chunks: string[] = [];

  for (const filePath of files) {
    try {
      chunks.push(fs.readFileSync(filePath, 'utf8'));
    } catch {
    }
  }

  return chunks.join('\n');
}

export class SecurityAgent {
  private readonly secretsScanner = new SecuritySecretsScanner();
  private readonly headersEvaluator = new SecurityHeadersEvaluator();
  private readonly scoreCalculator = new SecurityScoreCalculator();
  private readonly xssScanner = new SecurityXssScanner();
  private readonly sqliScanner = new SecuritySqliScanner();
  private readonly dependencyScanner = new SecurityDependencyScanner();

  private filterIgnoredIssues(issues: SecurityIssue[]): SecurityIssue[] {
    return issues.filter(issue => {
      if (!issue.filePath) return true;
      return !isIgnoredPath(issue.filePath);
    });
  }

  async scan(projectPath: string): Promise<SecurityScanResult> {
    const [
      secretIssues,
      xssIssues,
      sqliIssues,
      dependencyIssues
    ] = await Promise.all([
      this.secretsScanner.scan(projectPath),
      this.xssScanner.scan(projectPath),
      this.sqliScanner.scan(projectPath),
      this.dependencyScanner.scan(projectPath)
    ]);

    const projectText = readProjectText(projectPath);
    const headerResult = this.headersEvaluator.evaluate(projectText);

    const rawIssues: SecurityIssue[] = [
      ...secretIssues,
      ...xssIssues,
      ...sqliIssues,
      ...dependencyIssues,
      ...headerResult.issues
    ];

    const issues = this.filterIgnoredIssues(rawIssues);

    const summary = this.scoreCalculator.buildSummary(issues);
    const { score, grade } = this.scoreCalculator.calculate(issues);

    return {
      score,
      grade,
      issues,
      headers: headerResult.headers,
      summary,
      scannedAt: new Date().toISOString()
    };
  }
}
