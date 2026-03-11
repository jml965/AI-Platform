# منصة البناء الذكي - AI Platform

## Overview
An AI-powered workspace platform where users describe a project idea and get redirected to a workspace with execution logs (left panel), live preview (center), and file tree (right panel).

## Architecture
- **Monolithic setup**: Single Express server on port 5000 serves both API and Vite frontend
- **Frontend**: React + TypeScript + Vite + react-router-dom + TailwindCSS
- **Backend**: Express + TypeScript with in-memory Map storage
- **API_BASE**: `/api` (relative path, same port)

## Project Structure

### Client
```
client/src/
  app/router.tsx              # React Router configuration
  main.tsx                    # Entry point with RouterProvider
  pages/
    start-page.tsx            # Landing page - user enters project idea
    workspace-page.tsx        # Workspace page - 3-panel layout
    not-found.tsx             # 404 page
  components/
    layout/
      topbar.tsx              # Top navigation bar
      left-panel.tsx          # Left panel container (execution log + command input)
      right-panel.tsx         # Right panel container (file tree)
    workspace/
      workspace-layout.tsx    # Main 3-panel workspace with drag-to-resize
      execution-log.tsx       # Execution log component
      command-input.tsx       # Command input with send/stop/resume
      file-tree.tsx           # Collapsible file tree
      device-switcher.ts      # Device types and data (logic only, .ts)
    preview/
      preview-frame.tsx       # Live preview iframe with device switcher
    ui/                       # Shadcn UI components
  hooks/
    use-toast.ts
    use-mobile.tsx
  lib/
    api.ts                    # API utility functions
    queryClient.ts
    utils.ts
  types/
    execution-log.ts          # ExecutionStageKey, ExecutionEntryType, ExecutionLogEntry, ExecutionStageState, ExecutionFeedState
    engine-result.ts          # EngineResult type (mirrors server)
  styles/
    globals.css               # Global styles
```

### Server
```
server/
  index.ts                    # Main entry point (Express + Vite setup)
  routes.ts                   # Route registration (imports from routes/)
  routes/
    health.ts                 # GET /api/health
    project-routes.ts         # All project CRUD endpoints
  services/
    project-service.ts        # Project types, storage, business logic
  static.ts                   # Production static file serving
  storage.ts                  # Storage interface
  vite.ts                     # Vite dev server setup
```

## AI Engine (8 Agents)

### Core Agents
- **PlannerAgent** → Anthropic Claude Sonnet (claude-sonnet-4-20250514) — accepts intent
- **CoderAgent** → OpenAI GPT-5.2 (maxTokens: 16000) — accepts intent
- **ReviewerAgent** → Anthropic Claude Sonnet (claude-sonnet-4-20250514) — accepts intent
- **ExecutorAgent** → Local execution
- **DebuggerAgent** → Local analysis

### Extended Agents
- **RepairAgent** → OpenAI GPT-5.2 (maxTokens: 9000) — auto-repair loop
- **DeploymentAgent** → Local file deployment (graceful Docker fallback)
- **ServerProvisioningAgent** → Remote server provisioning (SSH/rsync/nginx)

### Engine Files
```
src/engine/
  ai-engine.ts                # Main orchestrator with runGenerationLoop
  loop-controller.ts          # Retry controller (max 3 attempts)
  loop-types.ts               # LoopStage, LoopAttempt, LoopResult types
  product-intent-types.ts     # ProductIntentType, ProductIntentResult
  product-intent-classifier.ts # Keyword-based intent detection (11 types, AR+EN)
  repair-prompt-builder.ts    # Structured repair prompts
  default-site-generator.ts   # Intent-aware fallback site generation
```

### Agent Files
```
src/agents/
  planner-agent.ts
  coder-agent.ts
  reviewer-agent.ts
  executor-agent.ts
  debugger-agent.ts
  repair-agent.ts
  deployment-agent.ts
  server-provisioning-agent.ts
```

### Deployment System
```
src/deployment/
  deployment-types.ts         # DeploymentTarget, DeploymentRequest, DeploymentResult
  app-runtime-detector.ts     # Detects static-site/node-app/react-app/unknown
  dockerfile-generator.ts     # Generates Dockerfile per runtime type
  container-runner.ts         # Runs Docker containers
```

### Provisioning System
```
src/provisioning/
  server-types.ts             # ServerConnection, ProvisioningRequest, ProvisioningResult
  nginx-config-generator.ts   # Generates nginx reverse proxy config
  provision-script-builder.ts # Generates bash provisioning scripts
  remote-file-sync.ts         # rsync-based file transfer
  ssh-client.ts               # SSH command execution with temp key management
```

### LLM Layer
```
src/llm/
  prompt-builder.ts           # Intent-aware prompts for Planner/Coder/Reviewer
  provider-factory.ts         # Provider routing (Anthropic/OpenAI)
```

## Generation Loop
1. **Intent Classification** → `ProductIntentClassifier.classify(prompt)` (11 product types)
2. **Planning** → `PlannerAgent.run(prompt, intent, options)` via Anthropic
3. **Coding** → `CoderAgent.run(prompt, plan, intent, options)` via OpenAI
4. **Review** → `ReviewerAgent.run(files, intent)` via Anthropic
5. **Execution** → `ExecutionTargetResolver.resolve(files)`
6. If errors: **Debug** → **Repair** → **Re-review** → **Re-execute** (up to 3 attempts)
7. **Deployment** → `DeploymentAgent.deploy({projectId, files})`
8. Fallback: `DefaultSiteGenerator.build(prompt, intent, options)` if no renderable website

## Execution Feed (Detailed AI Log)
Stage-based execution feed showing real-time AI operations:
- **Stages**: workspace → intent → planning → coding → review → repair → execution → security → devops → deployment → monitoring → done
- **Entry Types**: thought, code, error, fix, file, search, checkpoint, summary, status
- **SSE Protocol**: `{ type: "execution_feed", feed: { action: "stage-start"|"entry"|"stage-complete", stage, entry? } }`
- **Client State**: `ExecutionFeedState` with stages array, each stage has entries, status (idle/running/completed/failed), collapsed state
- **Rendering**: Collapsible stage headers with status icons; entries show code blocks, error panels, thought bubbles, fix cards
- **Key Files**: `client/src/types/execution-log.ts` (types), `client/src/components/execution-feed.tsx` (renderer), `src/engine/ai-engine.ts` (emitter)

## Options-Aware Code Generation
Start Page options (appType, tech, output) now flow through the full pipeline:
- **Client**: `workspace-layout.tsx` reads `project.options` and passes to `runEngine({ projectId, prompt, options })`
- **API**: `POST /api/engine/run` accepts `options` and passes to `engine.run(prompt, projectId, options)`
- **Engine**: `AIEngine.run` → `runGenerationLoop` → planner/coder agents receive options
- **Prompt Builder**: `buildPlannerMessages` and `buildCoderMessages` inject tech/output/appType directives
- **DefaultSiteGenerator**: Tech-specific fallback generators (React, Vue, Tailwind, Bootstrap, generic)
- **Types**: `src/types/engine-options.ts` defines `EngineOptions`, `buildOptionsContext`, `getTechFileExtensions`

## Product Intent Types
auction-platform, marketplace, dashboard, admin-panel, saas-app, crud-app, content-site, portfolio, landing-page, business-website, general-web-app

## Environment Variables
- `OPENAI_API_KEY` — Required for CoderAgent + RepairAgent
- `ANTHROPIC_API_KEY` — Required for PlannerAgent + ReviewerAgent
- `OPENAI_CODER_MODEL` — Optional (default: gpt-5.2)
- `ANTHROPIC_MODEL` — Optional (default: claude-sonnet-4-20250514)
- `SESSION_SECRET` — Session secret
- `GITHUB_TOKEN` — GitHub integration

## Key Constraints
- package.json is PROTECTED - cannot be edited
- Server runs on port 5000 only (other ports firewalled)
- All API calls use relative `/api` path
- User code must be executed exactly as provided, no modifications
- Command input clears immediately on send (before API response)

## Pages / Routes
- `/` — Start page (create new project, user dropdown menu)
- `/workspace/:projectId` — 3-panel workspace (execution log, preview, file tree)
- `/projects` — My Projects list (view, open, delete projects)
- `/account` — Account page (name, email, password)
- `/apps` — My Apps (deployed apps grid view)
- `/settings` — Settings (language AR/EN switch, theme dark/light, notifications toggle)

## API Endpoints
- `GET /api/projects` - List all projects
- `POST /api/project/start` - Create project from idea
- `GET /api/project/:id` - Get project info
- `DELETE /api/project/:id` - Delete project
- `GET /api/project/:id/export` - Download project as .tar.gz archive
- `GET /api/project/:id/export/files` - List project export files with content
- `GET /api/project/:id/logs` - Get execution logs
- `GET /api/project/:id/files` - Get file tree
- `GET /api/project/:id/preview` - Get preview HTML
- `POST /api/project/:id/command` - Send command to project
- `POST /api/engine/run` - Run AI engine
- `GET /api/engine/stream?projectId=...` - SSE stream
- `GET /api/health` - Health check

## i18n / Language
- Language preference stored in `localStorage` key `app_language` (values: "ar" | "en")
- On app boot (`main.tsx`), saved language sets `document.documentElement.dir` and `lang`
- Settings page updates both localStorage and document direction in real-time
- All pages read `document.documentElement.dir` for direction
