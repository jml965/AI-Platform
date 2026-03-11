// FILE: server/services/file-reader.ts

import fs from "fs";
import path from "path";

export function readFileSafe(base: string, filePath: string) {

  const fullPath = path.normalize(path.join(base, filePath));

  if (!fullPath.startsWith(base)) {
    throw new Error("Invalid path");
  }

  return fs.readFileSync(fullPath, "utf8");
}