import fs from 'fs';
import path from 'path';

export interface DevopsFixResult {
  applied: string[];
  skipped: string[];
  updatedFiles: string[];
}

const DEFAULT_DOCKERFILE = `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

RUN npm run build || true

EXPOSE 3000

CMD ["npm", "run", "start"]
`;

function ensureLine(content: string, line: string): { changed: boolean; content: string } {
  const exists = content.split(/\r?\n/).some((item) => item.trim() === line.trim());
  if (exists) {
    return { changed: false, content };
  }

  const normalized = content.trimEnd();
  const next = normalized ? `${normalized}\n${line}\n` : `${line}\n`;
  return { changed: true, content: next };
}

export class DevopsFixer {
  async apply(projectPath: string): Promise<DevopsFixResult> {
    const applied: string[] = [];
    const skipped: string[] = [];
    const updatedFiles: string[] = [];

    const dockerfilePath = path.join(projectPath, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
      fs.writeFileSync(dockerfilePath, DEFAULT_DOCKERFILE, 'utf8');
      applied.push('Created Dockerfile');
      updatedFiles.push(dockerfilePath);
    } else {
      skipped.push('Dockerfile already exists');
    }

    const envExamplePath = path.join(projectPath, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      fs.writeFileSync(envExamplePath, 'PORT=3000\nNODE_ENV=production\n', 'utf8');
      applied.push('Created .env.example');
      updatedFiles.push(envExamplePath);
    } else {
      let envContent = fs.readFileSync(envExamplePath, 'utf8');
      let changed = false;

      const portResult = ensureLine(envContent, 'PORT=3000');
      envContent = portResult.content;
      changed = changed || portResult.changed;

      const nodeEnvResult = ensureLine(envContent, 'NODE_ENV=production');
      envContent = nodeEnvResult.content;
      changed = changed || nodeEnvResult.changed;

      if (changed) {
        fs.writeFileSync(envExamplePath, envContent, 'utf8');
        applied.push('Updated .env.example with recommended keys');
        updatedFiles.push(envExamplePath);
      } else {
        skipped.push('.env.example already contains recommended keys');
      }
    }

    return {
      applied,
      skipped,
      updatedFiles
    };
  }
}
