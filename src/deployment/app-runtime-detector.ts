export type RuntimeType =
  | "static-site"
  | "node-app"
  | "react-app"
  | "unknown";

export class AppRuntimeDetector {
  detect(files: Array<{ path: string; content: string }>): RuntimeType {
    const paths = files.map((f) => f.path.toLowerCase());

    if (paths.includes("package.json")) return "node-app";

    if (paths.some((p) => p.endsWith(".jsx") || p.endsWith(".tsx")))
      return "react-app";

    if (paths.some((p) => p.endsWith(".html"))) return "static-site";

    return "unknown";
  }
}
