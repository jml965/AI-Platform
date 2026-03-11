export type SecurityFeedEventType =
  | 'security-first-run'
  | 'security-improved'
  | 'security-regressed'
  | 'security-unchanged';

export interface SecurityFeedEvent {
  id: string;
  type: SecurityFeedEventType;
  projectPath: string;
  title: string;
  message: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreDelta: number;
  newIssuesCount: number;
  resolvedIssuesCount: number;
  unchangedIssuesCount: number;
  timestamp: string;
}
