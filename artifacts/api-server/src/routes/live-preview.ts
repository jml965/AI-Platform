import { Router } from "express";
import { db } from "@workspace/db";
import { projectFilesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jsx": "application/javascript; charset=utf-8",
  ".ts": "application/javascript; charset=utf-8",
  ".tsx": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function getExtension(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  return dot >= 0 ? filePath.substring(dot).toLowerCase() : "";
}

function getMimeType(filePath: string): string {
  return MIME_TYPES[getExtension(filePath)] || "application/octet-stream";
}

async function getProjectFiles(projectId: string) {
  return db
    .select({
      filePath: projectFilesTable.filePath,
      content: projectFilesTable.content,
      fileType: projectFilesTable.fileType,
    })
    .from(projectFilesTable)
    .where(eq(projectFilesTable.projectId, projectId));
}

function buildReactPreviewHtml(files: { filePath: string; content: string; fileType: string | null }[]): string {
  const cssFiles = files.filter(f => f.filePath.endsWith(".css"));
  const tsxFiles = files.filter(f =>
    f.filePath.endsWith(".tsx") || f.filePath.endsWith(".jsx") ||
    f.filePath.endsWith(".ts") || f.filePath.endsWith(".js")
  );

  const allCss = cssFiles.map(f => f.content).join("\n\n");

  const indexHtml = files.find(f => f.filePath === "index.html" || f.filePath === "public/index.html");

  const isArabic = files.some(f => /[\u0600-\u06FF]/.test(f.content));

  const componentFiles = tsxFiles
    .filter(f => !f.filePath.includes("vite") && !f.filePath.includes("config") && !f.filePath.endsWith(".d.ts"))
    .sort((a, b) => {
      const order = (p: string) => {
        if (p.includes("types") || p.includes("constants") || p.includes("utils")) return 0;
        if (p.includes("context") || p.includes("provider")) return 1;
        if (p.includes("components/") || p.includes("sections/")) return 2;
        if (p.includes("pages/") || p.includes("views/")) return 3;
        if (p.includes("App")) return 4;
        if (p.includes("main") || p.includes("index")) return 5;
        return 3;
      };
      return order(a.filePath) - order(b.filePath);
    });

  const processedComponents = componentFiles.map(f => {
    let code = f.content;

    code = code.replace(/^import\s+.*?['"].*?['"];?\s*$/gm, "");
    code = code.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "");
    code = code.replace(/^import\s*{[^}]*}\s*from\s*['"][^'"]*['"];?\s*$/gm, "");
    code = code.replace(/^import\s+type\s+.*$/gm, "");

    code = code.replace(/^export\s+default\s+function\s+/gm, "function ");
    code = code.replace(/^export\s+default\s+/gm, "const _default = ");
    code = code.replace(/^export\s+function\s+/gm, "function ");
    code = code.replace(/^export\s+const\s+/gm, "const ");
    code = code.replace(/^export\s+(?:interface|type)\s+.*$/gm, "");
    code = code.replace(/^export\s*{[^}]*};?\s*$/gm, "");

    code = code.replace(/:\s*React\.FC(?:<[^>]*>)?/g, "");
    code = code.replace(/:\s*React\.ReactNode/g, "");
    code = code.replace(/:\s*React\.CSSProperties/g, "");
    code = code.replace(/:\s*(?:string|number|boolean|any)(?:\[\])?\s*(?=[,\)\}=])/g, "");
    code = code.replace(/<(\w+)(?:\s+extends\s+\w+)?>/g, "");
    code = code.replace(/as\s+(?:const|string|number|any|unknown)/g, "");
    code = code.replace(/interface\s+\w+\s*\{[^}]*\}/gs, "");
    code = code.replace(/type\s+\w+\s*=\s*[^;]+;/g, "");

    const funcMatch = code.match(/function\s+([A-Z]\w*)/);
    const constMatch = code.match(/const\s+([A-Z]\w*)\s*=/);
    const componentName = funcMatch?.[1] || constMatch?.[1] || null;

    return { filePath: f.filePath, code, componentName };
  });

  const componentRegistrations = processedComponents
    .filter(c => c.componentName)
    .map(c => `window.__components["${c.componentName}"] = ${c.componentName};`)
    .join("\n");

  const appComponent = processedComponents.find(c =>
    c.componentName === "App" || c.filePath.includes("App.tsx") || c.filePath.includes("App.jsx")
  );

  const rootComponent = appComponent?.componentName || "App";

  return `<!DOCTYPE html>
<html lang="${isArabic ? "ar" : "en"}" dir="${isArabic ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Tajawal:wght@300;400;500;700;800;900&family=Cairo:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${allCss}</style>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: 'Inter', 'Tajawal', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
    .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
    .animate-scale-in { animation: scaleIn 0.3s ease-out forwards; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__components = {};
    window.React = React;
    window.useState = React.useState;
    window.useEffect = React.useEffect;
    window.useRef = React.useRef;
    window.useMemo = React.useMemo;
    window.useCallback = React.useCallback;
    window.useContext = React.useContext;
    window.createContext = React.createContext;
    window.Fragment = React.Fragment;

    const Link = function(props) {
      return React.createElement("a", Object.assign({}, props, {
        href: props.to || props.href || "#",
        onClick: function(e) { e.preventDefault(); if (props.onClick) props.onClick(e); }
      }), props.children);
    };
    window.Link = Link;

    const BrowserRouter = function(props) { return React.createElement(React.Fragment, null, props.children); };
    const Routes = function(props) {
      const children = React.Children.toArray(props.children);
      return children.length > 0 ? children[0] : null;
    };
    const Route = function(props) { return props.element || null; };
    const useNavigate = function() { return function() {}; };
    const useParams = function() { return {}; };
    const useLocation = function() { return { pathname: "/", search: "", hash: "" }; };
    window.BrowserRouter = BrowserRouter;
    window.Routes = Routes;
    window.Route = Route;
    window.useNavigate = useNavigate;
    window.useParams = useParams;
    window.useLocation = useLocation;

    const lucideIcons = new Proxy({}, {
      get: function(target, name) {
        return function(props) {
          return React.createElement("span", {
            style: { display: "inline-flex", width: (props && props.size) || 24, height: (props && props.size) || 24 },
            className: props && props.className
          }, "");
        };
      }
    });
    window.lucideReact = lucideIcons;

    const motion = new Proxy({}, {
      get: function(target, tag) {
        return function(props) {
          var newProps = Object.assign({}, props);
          delete newProps.initial; delete newProps.animate; delete newProps.exit;
          delete newProps.whileHover; delete newProps.whileInView; delete newProps.variants;
          delete newProps.transition; delete newProps.viewport;
          return React.createElement(tag, newProps, props.children);
        };
      }
    });
    window.motion = motion;
    window.AnimatePresence = function(props) { return React.createElement(React.Fragment, null, props.children); };
  </script>

  ${processedComponents.map((c, i) => `
  <script type="text/babel" data-file="${c.filePath}">
    try {
      ${c.code}
      ${c.componentName ? `window.__components["${c.componentName}"] = ${c.componentName};` : ""}
    } catch(e) {
      console.warn("Component error in ${c.filePath}:", e.message);
    }
  </script>`).join("\n")}

  <script type="text/babel">
    const ErrorBoundary = class extends React.Component {
      constructor(props) { super(props); this.state = { error: null }; }
      static getDerivedStateFromError(error) { return { error }; }
      render() {
        if (this.state.error) {
          return React.createElement("div", {
            style: { padding: "40px", textAlign: "center", fontFamily: "Inter, sans-serif" }
          },
            React.createElement("h2", { style: { color: "#e53e3e", marginBottom: "10px" } }, "Preview Error"),
            React.createElement("p", { style: { color: "#718096" } }, this.state.error.message)
          );
        }
        return this.props.children;
      }
    };

    const RootApp = window.__components["${rootComponent}"] || window.__components["App"] || window.__components["Home"] || window.__components["Main"];

    if (RootApp) {
      const root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(
        React.createElement(ErrorBoundary, null,
          React.createElement(RootApp)
        )
      );
    } else {
      document.getElementById("root").innerHTML = '<div style="padding:40px;text-align:center;font-family:Inter,sans-serif"><h2 style="color:#4a5568">Building preview...</h2><p style="color:#a0aec0">Components are loading</p></div>';
    }
  </script>
</body>
</html>`;
}

router.get("/preview/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return res.status(400).send("Invalid project ID");
    }
    const files = await getProjectFiles(projectId);

    if (files.length === 0) {
      return res.status(404).send(`<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;background:#f7fafc"><div style="text-align:center"><h2 style="color:#4a5568">No files yet</h2><p style="color:#a0aec0">The project is being generated...</p></div></body></html>`);
    }

    const indexFile = files.find(f => f.filePath === "index.html" || f.filePath === "public/index.html");
    const hasReactFiles = files.some(f => f.filePath.endsWith(".tsx") || f.filePath.endsWith(".jsx"));

    if (hasReactFiles) {
      const html = buildReactPreviewHtml(files);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(html);
    }

    if (indexFile) {
      let html = indexFile.content;
      const cssFiles = files.filter(f => f.filePath.endsWith(".css"));
      const jsFiles = files.filter(f => f.filePath.endsWith(".js") && !f.filePath.includes("config"));

      for (const css of cssFiles) {
        const linkTag = new RegExp(`<link[^>]*href=["'](?:./)?${css.filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*/?>`, "gi");
        html = html.replace(linkTag, `<style>${css.content}</style>`);
      }

      for (const js of jsFiles) {
        const scriptTag = new RegExp(`<script[^>]*src=["'](?:./)?${js.filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>\\s*</script>`, "gi");
        html = html.replace(scriptTag, `<script>${js.content}</script>`);
      }

      if (!html.includes("<style>") && cssFiles.length > 0) {
        const allCss = cssFiles.map(f => f.content).join("\n");
        html = html.replace("</head>", `<style>${allCss}</style></head>`);
      }
      if (!html.includes("<script>") && jsFiles.length > 0) {
        const allJs = jsFiles.map(f => f.content).join("\n;\n");
        html = html.replace("</body>", `<script>${allJs}</script></body>`);
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(html);
    }

    res.status(404).send("No index.html found");
  } catch (err: any) {
    console.error("[LivePreview] Error:", err.message);
    res.status(500).send(`<html><body><h2>Preview Error</h2><p>${err.message}</p></body></html>`);
  }
});

router.get("/preview/:projectId/{*filePath}", async (req, res) => {
  try {
    const { projectId } = req.params;
    const requestedPath = (req.params as any).filePath || req.path.replace(`/preview/${projectId}/`, "");

    const file = await db
      .select({ content: projectFilesTable.content, filePath: projectFilesTable.filePath })
      .from(projectFilesTable)
      .where(
        and(
          eq(projectFilesTable.projectId, projectId),
          eq(projectFilesTable.filePath, requestedPath)
        )
      )
      .limit(1);

    if (file.length === 0) {
      return res.status(404).send("File not found");
    }

    const mimeType = getMimeType(requestedPath);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(file[0].content);
  } catch (err: any) {
    res.status(500).send("Error loading file");
  }
});

router.get("/preview-sse/:projectId", (req, res) => {
  const { projectId } = req.params;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": "*",
  });

  res.write(`data: ${JSON.stringify({ type: "connected", projectId, ts: Date.now() })}\n\n`);

  const onUpdate = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.projectId === projectId && (parsed.type === "file_saved" || parsed.type === "build_progress" || parsed.type === "build_complete")) {
        res.write(`data: ${data}\n\n`);
      }
    } catch {}
  };

  const { liveUpdateEmitter } = require("../lib/agents/engine-enhancements");
  liveUpdateEmitter.on("update", onUpdate);

  const heartbeat = setInterval(() => {
    try { res.write(`: heartbeat\n\n`); } catch { clearInterval(heartbeat); }
  }, 15000);

  req.on("close", () => {
    liveUpdateEmitter.off("update", onUpdate);
    clearInterval(heartbeat);
  });
});

export default router;
