import path from 'path';
import type { SecurityScanResult } from './security-types';

const lastScanStore = new Map<string, SecurityScanResult>();

function normalizeProjectPath(projectPath: string): string {
  return path.resolve(projectPath);
}

export class SecurityMonitorStore {
  getLastScan(projectPath: string): SecurityScanResult | undefined {
    return lastScanStore.get(normalizeProjectPath(projectPath));
  }

  setLastScan(projectPath: string, result: SecurityScanResult): void {
    lastScanStore.set(normalizeProjectPath(projectPath), result);
  }
}

export const securityMonitorStore = new SecurityMonitorStore();
