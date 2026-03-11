export type EngineOptions = {
  tab?: string;
  appType?: string;
  tech?: string;
  output?: string;
};

export function buildOptionsContext(options?: EngineOptions): string {
  if (!options) return "";

  const parts: string[] = [];

  if (options.appType) {
    const appTypeMap: Record<string, string> = {
      "web": "Web Application",
      "mobile": "Mobile Application",
      "api": "REST API / Backend Service",
      "desktop": "Desktop Application",
      "game": "Game",
      "ecommerce": "E-Commerce Platform",
      "blog": "Blog / Content Site",
      "portfolio": "Portfolio Website",
      "dashboard": "Dashboard / Admin Panel",
      "saas": "SaaS Application",
      "social": "Social Network / Community",
      "marketplace": "Marketplace Platform",
    };
    const label = appTypeMap[options.appType] || options.appType;
    parts.push(`Application Type: ${label}`);
  }

  if (options.tech) {
    const techMap: Record<string, string> = {
      "react": "React (JSX/TSX, component-based, hooks)",
      "vue": "Vue.js (SFC, Composition API)",
      "angular": "Angular (TypeScript, modules, services)",
      "svelte": "Svelte (compiled, reactive)",
      "next": "Next.js (React SSR/SSG framework)",
      "nuxt": "Nuxt.js (Vue SSR/SSG framework)",
      "html": "Plain HTML/CSS/JavaScript (no framework)",
      "tailwind": "HTML + Tailwind CSS",
      "bootstrap": "HTML + Bootstrap CSS",
      "express": "Express.js (Node.js backend)",
      "fastapi": "FastAPI (Python backend)",
      "django": "Django (Python full-stack)",
      "flask": "Flask (Python backend)",
      "laravel": "Laravel (PHP framework)",
      "rails": "Ruby on Rails",
      "spring": "Spring Boot (Java)",
      "dotnet": ".NET / ASP.NET Core (C#)",
    };
    const label = techMap[options.tech] || options.tech;
    parts.push(`Technology Stack: ${label}`);
  }

  if (options.output) {
    const outputMap: Record<string, string> = {
      "full": "Full working application with all pages and features",
      "prototype": "Functional prototype / MVP with core features",
      "ui": "UI/Frontend only (no backend logic)",
      "landing": "Landing page / marketing site",
      "api-only": "API/Backend only (no frontend)",
      "component": "Reusable component library",
      "template": "Project template / boilerplate",
    };
    const label = outputMap[options.output] || options.output;
    parts.push(`Output Type: ${label}`);
  }

  if (!parts.length) return "";

  return "\n\nProject Configuration (from user selections):\n" + parts.map(p => `- ${p}`).join("\n");
}

export function getTechFileExtensions(tech?: string): { main: string; style: string; script: string } {
  switch (tech) {
    case "react":
    case "next":
      return { main: "index.html", style: "styles.css", script: "App.tsx" };
    case "vue":
    case "nuxt":
      return { main: "index.html", style: "styles.css", script: "App.vue" };
    case "angular":
      return { main: "index.html", style: "styles.css", script: "app.component.ts" };
    case "svelte":
      return { main: "index.html", style: "styles.css", script: "App.svelte" };
    case "tailwind":
      return { main: "index.html", style: "styles.css", script: "script.js" };
    default:
      return { main: "index.html", style: "style.css", script: "script.js" };
  }
}
