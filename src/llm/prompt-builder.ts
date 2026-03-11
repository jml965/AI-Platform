function buildOptionsDirective(options: any): string {
  if (!options) return "";
  const parts: string[] = [];

  if (options.appType) {
    const map: Record<string, string> = {
      web: "Web Application", mobile: "Mobile Application", api: "REST API / Backend",
      desktop: "Desktop Application", game: "Game", ecommerce: "E-Commerce Platform",
      blog: "Blog / Content Site", portfolio: "Portfolio Website",
      dashboard: "Dashboard / Admin Panel", saas: "SaaS Application",
      social: "Social Network", marketplace: "Marketplace Platform",
    };
    parts.push(`App Type: ${map[options.appType] || options.appType}`);
  }

  if (options.tech) {
    const map: Record<string, string> = {
      react: "React", vue: "Vue.js", angular: "Angular", svelte: "Svelte",
      next: "Next.js", nuxt: "Nuxt.js", html: "Plain HTML/CSS/JS",
      tailwind: "HTML + Tailwind CSS", bootstrap: "HTML + Bootstrap",
      express: "Express.js", fastapi: "FastAPI", django: "Django",
      flask: "Flask", laravel: "Laravel", rails: "Ruby on Rails",
      spring: "Spring Boot", dotnet: ".NET Core",
    };
    parts.push(`Tech Stack: ${map[options.tech] || options.tech}`);
  }

  if (options.output) {
    const map: Record<string, string> = {
      full: "Full working application", prototype: "Functional prototype / MVP",
      ui: "UI/Frontend only", landing: "Landing page", "api-only": "API only",
      component: "Component library", template: "Project template",
    };
    parts.push(`Output: ${map[options.output] || options.output}`);
  }

  return parts.length ? parts.join(" | ") : "";
}

function buildTechDirective(tech: string): string {
  const directives: Record<string, string> = {
    react: "Generate React JSX/TSX components. Use functional components with hooks. Include a root App component.",
    vue: "Generate Vue.js Single File Components (.vue). Use Composition API with <script setup>.",
    angular: "Generate Angular TypeScript components with decorators, modules, and services.",
    svelte: "Generate Svelte components (.svelte files) with reactive declarations.",
    next: "Generate Next.js pages and components. Use App Router structure with page.tsx files.",
    nuxt: "Generate Nuxt.js pages and components. Use pages/ directory convention.",
    html: "Generate plain HTML/CSS/JavaScript files. No frameworks.",
    tailwind: "Generate HTML with Tailwind CSS utility classes. Include the Tailwind CDN link.",
    bootstrap: "Generate HTML with Bootstrap CSS classes. Include the Bootstrap CDN link.",
    express: "Generate an Express.js server with routes and middleware. Include package.json.",
    fastapi: "Generate a FastAPI Python application with routes and models.",
    django: "Generate a Django project with views, models, and templates.",
    flask: "Generate a Flask Python application with routes and templates.",
    laravel: "Generate Laravel PHP files with routes, controllers, and Blade templates.",
    rails: "Generate Ruby on Rails files with controllers, models, and ERB views.",
    spring: "Generate Spring Boot Java files with controllers and services.",
    dotnet: "Generate ASP.NET Core C# files with controllers and Razor views.",
  };
  return directives[tech] || "Prefer plain HTML/CSS/JS unless the request explicitly requires something else.";
}

function buildOutputDirective(output: string): string {
  const directives: Record<string, string> = {
    full: "Generate a complete, fully functional application with all pages, navigation, and features implemented.",
    prototype: "Generate a functional MVP/prototype with core features working. Focus on the essential user flow.",
    ui: "Generate frontend UI only. No backend logic. Focus on visual design, layout, and interactivity.",
    landing: "Generate a single high-converting landing page with hero, features, testimonials, and CTA sections.",
    "api-only": "Generate backend API endpoints only. Include route definitions, request/response schemas, and basic data handling.",
    component: "Generate a reusable component library with multiple self-contained UI components.",
    template: "Generate a project template/boilerplate with proper folder structure and configuration files.",
  };
  return directives[output] || "";
}

export function buildPlannerMessages(prompt: string, intent?: any, options?: any) {
  const optionsContext = options ? buildOptionsDirective(options) : "";

  return [
    {
      role: "system" as const,
      content:
        [
          "You are a senior software planner.",
          "Return only valid JSON.",
          "Plan a website/app build request into a concise execution plan.",
          "The plan must adapt to the product intent if provided.",
          optionsContext ? "IMPORTANT: The user has selected specific project configuration options. Your plan MUST reflect these choices:" : "",
          optionsContext,
          "JSON shape:",
          "{",
          '  "summary": "short summary",',
          '  "steps": [',
          '    { "id": "step-1", "title": "short title", "description": "clear description" }',
          "  ]",
          "}",
          "Rules:",
          "- 6 to 12 steps for comprehensive planning",
          "- no markdown",
          "- no explanation outside JSON",
          "- steps must be implementation-oriented",
          optionsContext ? "- steps must use the selected technology stack" : "",
          optionsContext ? "- steps must match the selected output type" : "",
        ].filter(Boolean).join("\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          prompt,
          intent: intent ?? null,
          projectOptions: options ?? null,
        },
        null,
        2
      ),
    },
  ];
}

export function buildCoderMessages(prompt: string, plan?: any, intent?: any, options?: any) {
  const serializedPlan =
    plan && typeof plan === "object" ? JSON.stringify(plan, null, 2) : "{}";

  const optionsContext = options ? buildOptionsDirective(options) : "";
  const techDirective = options?.tech ? buildTechDirective(options.tech) : "Prefer plain HTML/CSS/JS unless the request explicitly requires something else.";
  const outputDirective = options?.output ? buildOutputDirective(options.output) : "";

  return [
    {
      role: "system" as const,
      content:
        [
          "You are an expert full-stack code generator.",
          "Return only valid JSON.",
          "Generate a COMPLETE, FULLY FUNCTIONAL project based on the user request — NOT a skeleton or placeholder.",
          "You MUST generate ALL pages, ALL components, ALL styles, and ALL scripts needed for a production-ready project.",
          "Adapt the code structure and UI to the product intent if provided.",
          techDirective,
          optionsContext ? "CRITICAL: The user has selected specific project options. You MUST use these:" : "",
          optionsContext,
          outputDirective,
          "JSON shape:",
          "{",
          '  "files": [',
          '    { "path": "index.html", "content": "full complete HTML..." },',
          '    { "path": "pages/about.html", "content": "full page..." },',
          '    { "path": "pages/contact.html", "content": "full page..." },',
          '    { "path": "css/style.css", "content": "complete styles..." },',
          '    { "path": "css/responsive.css", "content": "media queries..." },',
          '    { "path": "js/main.js", "content": "full logic..." },',
          '    { "path": "js/components.js", "content": "reusable components..." }',
          "  ]",
          "}",
          "CRITICAL Rules:",
          "- Generate 5-20 files minimum depending on project complexity",
          "- Every page must be FULLY implemented with real content, not placeholder text",
          "- Include ALL pages: home, about, contact, features, pricing, dashboard, etc. as appropriate",
          "- Include complete CSS with responsive design, animations, and dark mode support",
          "- Include complete JavaScript with real functionality, form validation, navigation, and interactivity",
          "- Use proper folder structure: pages/, css/, js/, assets/, components/",
          "- All navigation links must work and point to real pages",
          "- Include a README.md with project description and setup instructions",
          "- no markdown fences",
          "- no explanation outside JSON",
          "- files must be directly writable",
          "- output must be previewable in a browser",
          "- if Arabic content is appropriate, use Arabic and RTL layout throughout",
          "- if intent is auction-platform, include: listings, bidding UI, user profiles, categories, search, dashboard",
          "- if intent is dashboard/admin-panel, include: stats cards, charts, tables, filters, sidebar, settings",
          "- if intent is marketplace, include: product listings, product detail, cart, checkout, search, categories",
          "- if intent is ecommerce, include: shop page, product pages, cart, checkout, user account, order history",
          "- if intent is social, include: feed, profiles, messaging, notifications, settings",
          "- if intent is saas, include: landing page, pricing, dashboard, settings, onboarding",
        ].filter(Boolean).join("\n"),
    },
    {
      role: "user" as const,
      content:
        [
          `User request:\n${prompt}`,
          "",
          `Execution plan:\n${serializedPlan}`,
          "",
          `Intent:\n${JSON.stringify(intent ?? null, null, 2)}`,
          "",
          options ? `Project Options:\n${JSON.stringify(options, null, 2)}` : "",
        ].filter(Boolean).join("\n"),
    },
  ];
}

export function buildReviewerMessages(
  files: Array<{ path: string; content: string }>,
  intent?: any
) {
  const compactFiles = files.map((file) => ({
    path: file.path,
    contentPreview: file.content.slice(0, 4000),
  }));

  return [
    {
      role: "system" as const,
      content:
        [
          "You are a strict code reviewer.",
          "Return only valid JSON.",
          "Review generated website files.",
          "Validate alignment with the product intent if provided.",
          "JSON shape:",
          "{",
          '  "issues": [',
          '    { "level": "error|warning|info", "message": "text", "file": "optional path" }',
          "  ],",
          '  "summary": "short summary"',
          "}",
          "Rules:",
          "- no markdown",
          "- no explanation outside JSON",
          "- be concrete",
          "- focus on previewability, validity, missing essentials, and intent alignment",
        ].join("\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          intent: intent ?? null,
          files: compactFiles,
        },
        null,
        2
      ),
    },
  ];
}
