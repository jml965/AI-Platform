import crypto from "crypto";
import fs from "fs";
import path from "path";

export type ProjectFile = {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
};

export type ProjectLog = {
  id: string;
  message: string;
  status: "done" | "running" | "waiting";
  createdAt: string;
};

export type ProjectOptions = {
  tab?: string;
  appType?: string;
  tech?: string;
  output?: string;
};

export type ProjectRecord = {
  id: string;
  idea: string;
  options: ProjectOptions;
  files: ProjectFile[];
  logs: ProjectLog[];
  previewHtml: string;
  engineRan: boolean;
  createdAt: string;
};

const STORAGE_FILE = path.join(process.cwd(), ".data", "projects.json");

function ensureDataDir() {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadProjects(): Map<string, ProjectRecord> {
  const map = new Map<string, ProjectRecord>();
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
      const arr: ProjectRecord[] = JSON.parse(raw);
      for (const p of arr) {
        map.set(p.id, p);
      }
    }
  } catch (e) {
    console.error("Failed to load projects from disk:", e);
  }
  return map;
}

function saveProjects() {
  try {
    ensureDataDir();
    const arr = Array.from(projects.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(arr, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save projects to disk:", e);
  }
}

const projects = loadProjects();

function makeId() {
  return crypto.randomUUID();
}

function normalizeOptions(raw?: ProjectOptions): ProjectOptions {
  if (!raw) return {};

  const techMap: Record<string, string> = {
    "html-css-js": "html", "nextjs": "next", "nodejs": "express",
    "python": "fastapi", "react-native": "react", "flutter": "html",
  };

  const appTypeMap: Record<string, string> = {
    "mobile-web": "mobile", "android": "mobile", "ios": "mobile",
  };

  const outputMap: Record<string, string> = {
    "website": "full", "plan": "prototype",
  };

  return {
    tab: raw.tab,
    appType: appTypeMap[raw.appType || ""] || raw.appType,
    tech: techMap[raw.tech || ""] || raw.tech,
    output: outputMap[raw.output || ""] || raw.output,
  };
}

export function createProject(idea: string, options?: ProjectOptions): ProjectRecord {
  const id = makeId();

  const files: ProjectFile[] = [
    { id: makeId(), name: "client", path: "client", type: "folder" },
    { id: makeId(), name: "server", path: "server", type: "folder" },
    { id: makeId(), name: "shared", path: "shared", type: "folder" },
    { id: makeId(), name: "package.json", path: "package.json", type: "file" },
    { id: makeId(), name: "index.html", path: "client/index.html", type: "file" },
    { id: makeId(), name: "app.tsx", path: "client/src/app.tsx", type: "file" }
  ];

  const logs: ProjectLog[] = [
    {
      id: makeId(),
      message: "تم استلام فكرة المشروع",
      status: "done",
      createdAt: new Date().toISOString()
    },
    {
      id: makeId(),
      message: "جارٍ تحليل المتطلبات",
      status: "done",
      createdAt: new Date().toISOString()
    },
    {
      id: makeId(),
      message: "جارٍ تجهيز هيكل المشروع",
      status: "running",
      createdAt: new Date().toISOString()
    },
    {
      id: makeId(),
      message: "بانتظار أوامر إضافية من المستخدم",
      status: "waiting",
      createdAt: new Date().toISOString()
    }
  ];

  const previewHtml = `
  <html dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #0b1020;
          color: white;
        }
        .wrap {
          padding: 40px;
        }
        .hero {
          padding: 32px;
          border-radius: 20px;
          background: linear-gradient(135deg, #111827, #0f172a);
          border: 1px solid #243041;
        }
        .title {
          font-size: 42px;
          color: #f59e0b;
          margin: 0 0 12px;
        }
        .idea {
          font-size: 20px;
          color: #cbd5e1;
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="hero">
          <h1 class="title">معاينة أولية للمشروع</h1>
          <div class="idea">${idea}</div>
        </div>
      </div>
    </body>
  </html>
  `;

  const project: ProjectRecord = {
    id,
    idea,
    options: normalizeOptions(options),
    files,
    logs,
    previewHtml,
    engineRan: false,
    createdAt: new Date().toISOString(),
  };
  projects.set(id, project);
  saveProjects();
  return project;
}

export function getProject(projectId: string): ProjectRecord | undefined {
  return projects.get(projectId);
}

export function getAllProjects(): ProjectRecord[] {
  return Array.from(projects.values()).reverse();
}

export function deleteProject(projectId: string): boolean {
  const deleted = projects.delete(projectId);
  if (deleted) saveProjects();
  return deleted;
}

export function addLogToProject(projectId: string, command: string): boolean {
  const project = projects.get(projectId);
  if (!project) return false;

  project.logs.unshift({
    id: makeId(),
    message: `أمر جديد من المستخدم: ${command}`,
    status: "done",
    createdAt: new Date().toISOString()
  });

  project.logs.unshift({
    id: makeId(),
    message: "تم تحديث خطة التنفيذ بناءً على الأمر الجديد",
    status: "running",
    createdAt: new Date().toISOString()
  });

  saveProjects();
  return true;
}
