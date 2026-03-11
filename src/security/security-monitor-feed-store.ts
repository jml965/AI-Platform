import path from 'path';
import type { SecurityFeedEvent } from './security-monitor-feed-types';

const securityFeedStore = new Map<string, SecurityFeedEvent[]>();
const MAX_EVENTS_PER_PROJECT = 100;

function normalizeProjectPath(projectPath: string): string {
  return path.resolve(projectPath);
}

export class SecurityMonitorFeedStore {
  getEvents(projectPath: string): SecurityFeedEvent[] {
    return securityFeedStore.get(normalizeProjectPath(projectPath)) ?? [];
  }

  addEvent(projectPath: string, event: SecurityFeedEvent): void {
    const key = normalizeProjectPath(projectPath);
    const current = securityFeedStore.get(key) ?? [];
    const next = [event, ...current].slice(0, MAX_EVENTS_PER_PROJECT);
    securityFeedStore.set(key, next);
  }

  clear(projectPath: string): void {
    securityFeedStore.delete(normalizeProjectPath(projectPath));
  }
}

export const securityMonitorFeedStore = new SecurityMonitorFeedStore();
