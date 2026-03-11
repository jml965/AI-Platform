import path from 'path';
import type { DevopsResult } from './devops-types';

const lastDevopsScanStore = new Map<string, DevopsResult>();

function normalizeProjectPath(projectPath: string): string {
  return path.resolve(projectPath);
}

export class DevopsMonitorStore {
  getLastScan(projectPath: string): DevopsResult | undefined {
    return lastDevopsScanStore.get(normalizeProjectPath(projectPath));
  }

  setLastScan(projectPath: string, result: DevopsResult): void {
    lastDevopsScanStore.set(normalizeProjectPath(projectPath), result);
  }
}

export const devopsMonitorStore = new DevopsMonitorStore();
