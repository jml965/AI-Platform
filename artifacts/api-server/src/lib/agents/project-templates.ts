import type { ProjectFramework, GeneratedFile } from "./types";

export interface ProjectTemplate {
  framework: ProjectFramework;
  label: string;
  baseFiles: GeneratedFile[];
  directories: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

const REACT_VITE_TEMPLATE: ProjectTemplate = {
  framework: "react-vite",
  label: "React + Vite",
  baseFiles: [
    {
      filePath: "index.html",
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      fileType: "html",
    },
    {
      filePath: "src/main.tsx",
      content: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      fileType: "tsx",
    },
    {
      filePath: "src/index.css",
      content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; }`,
      fileType: "css",
    },
    {
      filePath: "vite.config.ts",
      content: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});`,
      fileType: "ts",
    },
    {
      filePath: "tsconfig.json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            useDefineForClassFields: true,
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noFallthroughCasesInSwitch: true,
          },
          include: ["src"],
        },
        null,
        2
      ),
      fileType: "json",
    },
  ],
  directories: ["src", "src/components", "src/pages", "src/hooks", "src/utils", "public"],
  dependencies: {
    react: "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
  },
  devDependencies: {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    typescript: "^5.5.0",
    vite: "^5.4.0",
  },
  scripts: {
    dev: "vite",
    build: "tsc && vite build",
    preview: "vite preview",
  },
};

const EXPRESS_TEMPLATE: ProjectTemplate = {
  framework: "express",
  label: "Node.js + Express",
  baseFiles: [
    {
      filePath: "src/index.ts",
      content: `import express from "express";
import cors from "cors";
import { router } from "./routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api", router);

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
      fileType: "ts",
    },
    {
      filePath: "src/routes/index.ts",
      content: `import { Router } from "express";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});`,
      fileType: "ts",
    },
    {
      filePath: "tsconfig.json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            lib: ["ES2020"],
            outDir: "./dist",
            rootDir: "./src",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
          },
          include: ["src"],
        },
        null,
        2
      ),
      fileType: "json",
    },
  ],
  directories: ["src", "src/routes", "src/middleware", "src/controllers", "src/utils"],
  dependencies: {
    express: "^4.19.0",
    cors: "^2.8.5",
  },
  devDependencies: {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.14.0",
    typescript: "^5.5.0",
    "ts-node": "^10.9.2",
    nodemon: "^3.1.0",
  },
  scripts: {
    dev: "nodemon --exec ts-node src/index.ts",
    build: "tsc",
    start: "node dist/index.js",
  },
};

const NEXTJS_TEMPLATE: ProjectTemplate = {
  framework: "nextjs",
  label: "Next.js",
  baseFiles: [
    {
      filePath: "src/app/layout.tsx",
      content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App",
  description: "Built with Next.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,
      fileType: "tsx",
    },
    {
      filePath: "src/app/globals.css",
      content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; }`,
      fileType: "css",
    },
    {
      filePath: "src/app/page.tsx",
      content: `export default function Home() {
  return (
    <main>
      <h1>Welcome</h1>
    </main>
  );
}`,
      fileType: "tsx",
    },
    {
      filePath: "next.config.js",
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;`,
      fileType: "js",
    },
    {
      filePath: "tsconfig.json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "es5",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./src/*"] },
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"],
        },
        null,
        2
      ),
      fileType: "json",
    },
  ],
  directories: [
    "src",
    "src/app",
    "src/app/api",
    "src/components",
    "src/lib",
    "src/utils",
    "public",
  ],
  dependencies: {
    next: "^14.2.0",
    react: "^18.3.0",
    "react-dom": "^18.3.0",
  },
  devDependencies: {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    typescript: "^5.5.0",
  },
  scripts: {
    dev: "next dev",
    build: "next build",
    start: "next start",
  },
};

const FASTAPI_TEMPLATE: ProjectTemplate = {
  framework: "fastapi",
  label: "Python + FastAPI",
  baseFiles: [
    {
      filePath: "main.py",
      content: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router

app = FastAPI(title="App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)`,
      fileType: "py",
    },
    {
      filePath: "routes/__init__.py",
      content: `from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}`,
      fileType: "py",
    },
    {
      filePath: "requirements.txt",
      content: `fastapi>=0.111.0
uvicorn[standard]>=0.30.0
pydantic>=2.7.0`,
      fileType: "txt",
    },
  ],
  directories: ["routes", "models", "schemas", "utils"],
  dependencies: {
    fastapi: ">=0.111.0",
    uvicorn: ">=0.30.0",
    pydantic: ">=2.7.0",
  },
  devDependencies: {},
  scripts: {
    dev: "uvicorn main:app --reload --port ${PORT:-8000}",
    start: "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}",
  },
};

const STATIC_TEMPLATE: ProjectTemplate = {
  framework: "static",
  label: "Static HTML/CSS/JS",
  baseFiles: [
    {
      filePath: "index.html",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <script src="script.js"></script>
</body>
</html>`,
      fileType: "html",
    },
    {
      filePath: "styles.css",
      content: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; }`,
      fileType: "css",
    },
    {
      filePath: "script.js",
      content: `document.addEventListener("DOMContentLoaded", () => {
  console.log("App loaded");
});`,
      fileType: "js",
    },
  ],
  directories: ["assets", "assets/images"],
  dependencies: {},
  devDependencies: {},
  scripts: {},
};

const TEMPLATES: Record<ProjectFramework, ProjectTemplate> = {
  "react-vite": REACT_VITE_TEMPLATE,
  express: EXPRESS_TEMPLATE,
  nextjs: NEXTJS_TEMPLATE,
  fastapi: FASTAPI_TEMPLATE,
  static: STATIC_TEMPLATE,
};

export function getProjectTemplate(framework: ProjectFramework): ProjectTemplate {
  return TEMPLATES[framework];
}

export function getAllTemplates(): ProjectTemplate[] {
  return Object.values(TEMPLATES);
}

export function getFrameworkChoices(): { value: ProjectFramework; label: string }[] {
  return Object.entries(TEMPLATES).map(([value, template]) => ({
    value: value as ProjectFramework,
    label: template.label,
  }));
}
