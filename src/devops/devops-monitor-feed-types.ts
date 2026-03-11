export type DevopsFeedEventType =
  | 'devops-first-run'
  | 'devops-improved'
  | 'devops-regressed'
  | 'devops-unchanged';

export interface DevopsFeedEvent {
  id: string;
  type: DevopsFeedEventType;
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
