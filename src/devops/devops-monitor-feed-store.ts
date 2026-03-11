import path from 'path';
import type { DevopsFeedEvent } from './devops-monitor-feed-types';

const devopsFeedStore = new Map<string, DevopsFeedEvent[]>();
const MAX_EVENTS_PER_PROJECT = 100;

function normalizeProjectPath(projectPath: string): string {
  return path.resolve(projectPath);
}

export class DevopsMonitorFeedStore {
  getEvents(projectPath: string): DevopsFeedEvent[] {
    return devopsFeedStore.get(normalizeProjectPath(projectPath)) ?? [];
  }

  addEvent(projectPath: string, event: DevopsFeedEvent): void {
    const key = normalizeProjectPath(projectPath);
    const current = devopsFeedStore.get(key) ?? [];
    const next = [event, ...current].slice(0, MAX_EVENTS_PER_PROJECT);
    devopsFeedStore.set(key, next);
  }

  clear(projectPath: string): void {
    devopsFeedStore.delete(normalizeProjectPath(projectPath));
  }
}

export const devopsMonitorFeedStore = new DevopsMonitorFeedStore();
