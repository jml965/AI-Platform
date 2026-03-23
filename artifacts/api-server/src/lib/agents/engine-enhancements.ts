import * as fs from "fs";
import * as path from "path";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { EventEmitter } from "events";

const PROJECT_ROOT = process.env.PROJECT_ROOT || (process.env.NODE_ENV === "production" ? "/app" : path.resolve(process.cwd()));

export const liveUpdateEmitter = new EventEmitter();
liveUpdateEmitter.setMaxListeners(100);

export function broadcastUpdate(type: string, data: any) {
  liveUpdateEmitter.emit("update", JSON.stringify({ type, ...data, ts: Date.now() }));
}

const contextCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 60000;

export function getCachedContext(key: string): any | null {
  const entry = contextCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { contextCache.delete(key); return null; }
  return entry.data;
}

export function setCachedContext(key: string, data: any) {
  contextCache.set(key, { data, ts: Date.now() });
  if (contextCache.size > 500) {
    const oldest = [...contextCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    for (let i = 0; i < 100; i++) contextCache.delete(oldest[i][0]);
  }
}

export function invalidateCache(pattern?: string) {
  if (!pattern) { contextCache.clear(); return; }
  for (const k of contextCache.keys()) {
    if (k.includes(pattern)) contextCache.delete(k);
  }
}

interface DirectEditResult {
  handled: boolean;
  response?: string;
  cost?: number;
}

export function tryDirectEngine(message: string, lang: "ar" | "en"): DirectEditResult {
  const msg = message.trim();

  const textChangePattern = /(?:غي[ّر]|بد[ّل]|استبدل|حو[ّل]|change|replace)\s+(?:كلمة\s+|نص\s+|عبارة\s+|text\s+)?["«"']?(.+?)["»"']?\s+(?:في\s+.+?\s+)?(?:ال[ىي]|بـ?|لـ?|يصير|تصير|يكون|to|with)\s+["«"']?(.+?)["»"']?\s*$/i;
  const match = msg.match(textChangePattern);
  if (match) {
    return { handled: true, response: `__DIRECT_TEXT_EDIT__:${match[1].trim()}|${match[2].trim()}`, cost: 0 };
  }

  const colorPattern = /(?:غي[ّر]|بد[ّل]|اجعل|خلي|change|make)\s+(?:لون|خلفية|color|background)\s+(.+?)\s+(?:ال[ىي]|بـ?|لـ?|to)\s+(.+?)$/i;
  const colorMatch = msg.match(colorPattern);
  if (colorMatch) {
    return { handled: true, response: `__DIRECT_STYLE_EDIT__:${colorMatch[1].trim()}|${colorMatch[2].trim()}`, cost: 0 };
  }

  const sizePattern = /(?:كب[ّر]|صغ[ّر]|حجم|increase|decrease|resize)\s+(?:خط|font|حجم|size)\s+(.+?)(?:\s+(?:ال[ىي]|بـ?|لـ?|to)\s+(\d+))?$/i;
  const sizeMatch = msg.match(sizePattern);
  if (sizeMatch) {
    return { handled: true, response: `__DIRECT_SIZE_EDIT__:${sizeMatch[1].trim()}|${sizeMatch[2] || "auto"}`, cost: 0 };
  }

  const hidePattern = /(?:اخفي|اخف[ِي]|اظهر|اظهري|hide|show|toggle)\s+(.+?)$/i;
  const hideMatch = msg.match(hidePattern);
  if (hideMatch) {
    const action = /اخف|hide/i.test(msg) ? "hide" : "show";
    return { handled: true, response: `__DIRECT_VISIBILITY__:${hideMatch[1].trim()}|${action}`, cost: 0 };
  }

  return { handled: false };
}

export interface ModelRoute {
  tier: "direct" | "fast" | "standard" | "advanced";
  reason: string;
  suggestedModel?: { provider: string; model: string };
}

export function routeToModel(message: string, complexityScore: number): ModelRoute {
  const msg = message.toLowerCase();

  const directPatterns = [
    /^(?:غي[ّر]|بد[ّل]|استبدل)\s+/,
    /^(?:اخفي|اظهر|حذف|delete|hide|show)\s+/,
    /^(?:change|replace|update)\s+(?:text|color|font)/i,
  ];
  for (const p of directPatterns) {
    if (p.test(msg)) return { tier: "direct", reason: "Simple edit pattern matched" };
  }

  if (complexityScore <= 20) {
    return { tier: "fast", reason: "Low complexity greeting/question", suggestedModel: { provider: "google", model: "gemini-2.5-flash" } };
  }

  if (complexityScore <= 55) {
    return { tier: "standard", reason: "Standard complexity task" };
  }

  return { tier: "advanced", reason: "High complexity requires full model" };
}

const fileSnapshots = new Map<string, string>();

export function snapshotFile(filePath: string): boolean {
  try {
    const resolved = path.resolve(PROJECT_ROOT, filePath);
    if (!fs.existsSync(resolved)) return false;
    fileSnapshots.set(filePath, fs.readFileSync(resolved, "utf-8"));
    return true;
  } catch { return false; }
}

export function rollbackFile(filePath: string): boolean {
  const snapshot = fileSnapshots.get(filePath);
  if (!snapshot) return false;
  try {
    const resolved = path.resolve(PROJECT_ROOT, filePath);
    fs.writeFileSync(resolved, snapshot, "utf-8");
    fileSnapshots.delete(filePath);
    return true;
  } catch { return false; }
}

export function clearSnapshot(filePath: string) {
  fileSnapshots.delete(filePath);
}

export async function batchEditFiles(edits: { file: string; old_text: string; new_text: string }[]): Promise<{ success: boolean; results: any[]; rolledBack?: boolean }> {
  const results: any[] = [];
  const editedFiles: string[] = [];

  for (const edit of edits) {
    snapshotFile(edit.file);
  }

  try {
    for (const edit of edits) {
      const resolved = path.resolve(PROJECT_ROOT, edit.file);
      if (!fs.existsSync(resolved)) {
        throw new Error(`File not found: ${edit.file}`);
      }
      const content = fs.readFileSync(resolved, "utf-8");
      if (!content.includes(edit.old_text)) {
        throw new Error(`Text not found in ${edit.file}: "${edit.old_text.slice(0, 50)}"`);
      }
      const newContent = content.replace(edit.old_text, edit.new_text);
      fs.writeFileSync(resolved, newContent, "utf-8");
      editedFiles.push(edit.file);
      results.push({ file: edit.file, success: true, matchesReplaced: 1 });
    }
    for (const f of edits) clearSnapshot(f.file);
    return { success: true, results };
  } catch (err: any) {
    for (const f of editedFiles) rollbackFile(f);
    for (const f of edits) clearSnapshot(f.file);
    return { success: false, results: [{ error: err.message }], rolledBack: true };
  }
}

export async function createSmartTable(description: string): Promise<string> {
  const nameMatch = description.match(/(?:جدول|table)\s+(\w+)/i);
  const tableName = nameMatch ? nameMatch[1].toLowerCase() : `custom_${Date.now()}`;

  const fieldPatterns = /(?:فيه|يحتوي|columns?|fields?|حقول)[:\s]+(.+)/i;
  const fieldsMatch = description.match(fieldPatterns);
  let fields: string[] = [];
  if (fieldsMatch) {
    fields = fieldsMatch[1].split(/[,،و&+]/g).map(f => f.trim()).filter(Boolean);
  }

  const fieldMap: Record<string, string> = {
    "اسم": "name TEXT", "name": "name TEXT",
    "اسم_عربي": "name_ar TEXT", "اسم_انجليزي": "name_en TEXT",
    "إيميل": "email TEXT UNIQUE", "email": "email TEXT UNIQUE", "بريد": "email TEXT UNIQUE",
    "رقم": "phone TEXT", "phone": "phone TEXT", "هاتف": "phone TEXT", "جوال": "phone TEXT",
    "حالة": "status TEXT DEFAULT 'active'", "status": "status TEXT DEFAULT 'active'",
    "وصف": "description TEXT", "description": "description TEXT",
    "سعر": "price DECIMAL(10,2)", "price": "price DECIMAL(10,2)", "مبلغ": "amount DECIMAL(10,2)",
    "عدد": "quantity INTEGER DEFAULT 0", "quantity": "quantity INTEGER DEFAULT 0", "كمية": "quantity INTEGER DEFAULT 0",
    "تاريخ": "date TIMESTAMP", "date": "date TIMESTAMP",
    "صورة": "image_url TEXT", "image": "image_url TEXT",
    "رابط": "url TEXT", "url": "url TEXT", "link": "url TEXT",
    "ملاحظات": "notes TEXT", "notes": "notes TEXT",
    "نوع": "type TEXT", "type": "type TEXT",
    "عنوان": "title TEXT", "title": "title TEXT",
    "محتوى": "content TEXT", "content": "content TEXT",
    "مستخدم": "user_id UUID", "user": "user_id UUID",
    "مشروع": "project_id UUID", "project": "project_id UUID",
    "تصنيف": "category TEXT", "category": "category TEXT",
    "ترتيب": "sort_order INTEGER DEFAULT 0", "order": "sort_order INTEGER DEFAULT 0",
    "فعال": "is_active BOOLEAN DEFAULT true", "active": "is_active BOOLEAN DEFAULT true",
  };

  let columns = ["id UUID DEFAULT gen_random_uuid() PRIMARY KEY"];

  for (const field of fields) {
    const lower = field.toLowerCase().trim();
    if (fieldMap[lower]) {
      columns.push(fieldMap[lower]);
    } else {
      columns.push(`${lower.replace(/\s+/g, "_")} TEXT`);
    }
  }

  columns.push("created_at TIMESTAMP DEFAULT NOW() NOT NULL");
  columns.push("updated_at TIMESTAMP DEFAULT NOW() NOT NULL");

  const createSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns.join(",\n  ")}\n)`;

  try {
    await db.execute(sql.raw(createSQL));
    const idxSQL = `CREATE INDEX IF NOT EXISTS idx_${tableName}_created ON ${tableName} (created_at DESC)`;
    await db.execute(sql.raw(idxSQL));
    return JSON.stringify({ success: true, table: tableName, columns: columns.length, sql: createSQL });
  } catch (err: any) {
    return JSON.stringify({ success: false, error: err.message, sql: createSQL });
  }
}

let componentMap: { path: string; name: string; type: string; imports: string[]; exports: string[] }[] | null = null;
let componentMapTs = 0;

export function scanComponentLibrary(forceRefresh = false): any {
  if (componentMap && !forceRefresh && Date.now() - componentMapTs < 120000) {
    return { components: componentMap, cached: true, count: componentMap.length };
  }

  const webRoot = path.resolve(PROJECT_ROOT, "artifacts/website-builder/src");
  if (!fs.existsSync(webRoot)) return { error: "website-builder not found" };

  const results: typeof componentMap = [];
  const walk = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith(".") || e.name === "node_modules") continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (!e.name.match(/\.(tsx?|jsx?)$/)) continue;
        try {
          const content = fs.readFileSync(full, "utf-8");
          const relPath = path.relative(webRoot, full);
          const imports = (content.match(/import\s+.+\s+from\s+["'](.+?)["']/g) || []).map(m => {
            const match = m.match(/from\s+["'](.+?)["']/);
            return match ? match[1] : "";
          }).filter(Boolean);
          const exports = (content.match(/export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g) || []).map(m => {
            const match = m.match(/(?:function|const|class|interface|type)\s+(\w+)/);
            return match ? match[1] : "";
          }).filter(Boolean);
          const type = relPath.startsWith("pages/") ? "page" : relPath.startsWith("components/") ? "component" : relPath.startsWith("lib/") ? "library" : "other";
          results!.push({ path: relPath, name: e.name.replace(/\.(tsx?|jsx?)$/, ""), type, imports, exports });
        } catch {}
      }
    } catch {}
  };
  walk(webRoot);
  componentMap = results;
  componentMapTs = Date.now();
  return { components: results, cached: false, count: results.length };
}

export async function recordLearning(agentKey: string, tool: string, action: string, input: any, result: string, success: boolean, durationMs?: number) {
  try {
    let pattern = "";
    let learnedRule = "";

    if (tool === "edit_component" && success) {
      pattern = `edit:${(input?.componentPath || "").split("/").pop()}`;
      learnedRule = `File ${input?.componentPath} edited successfully. Pattern: old="${(input?.old_text || "").slice(0, 30)}" → new="${(input?.new_text || "").slice(0, 30)}"`;
    } else if (tool === "search_text") {
      const hasResults = !result.includes("no results") && !result.includes("0 matches") && result.length > 20;
      pattern = `search:${hasResults ? "found" : "empty"}:${(input?.text || "").slice(0, 30)}`;
      learnedRule = hasResults ? `Search for "${input?.text}" found results` : `Search for "${input?.text}" returned empty — try DB query next`;
    } else if (tool === "run_sql" || tool === "db_query") {
      pattern = `sql:${success ? "ok" : "fail"}`;
      learnedRule = success ? `SQL executed successfully` : `SQL failed: ${result.slice(0, 100)}`;
    }

    await db.execute(sql.raw(`
      INSERT INTO ai_learning_log (id, agent_key, action, tool, input, result, success, pattern, learned_rule, duration_ms, created_at)
      VALUES (gen_random_uuid(), '${agentKey}', '${action.slice(0, 50)}', '${tool}', '${JSON.stringify(input).replace(/'/g, "''")}', '${(result || "").slice(0, 500).replace(/'/g, "''")}', ${success ? 1 : 0}, '${pattern.replace(/'/g, "''")}', '${learnedRule.replace(/'/g, "''")}', ${durationMs || 0}, NOW())
    `));
  } catch {}
}

export async function getLearnedPatterns(agentKey: string, limit = 20): Promise<any[]> {
  try {
    const result = await db.execute(sql.raw(`
      SELECT pattern, learned_rule, success, COUNT(*) as occurrences
      FROM ai_learning_log
      WHERE agent_key = '${agentKey}' AND pattern != ''
      GROUP BY pattern, learned_rule, success
      ORDER BY occurrences DESC
      LIMIT ${limit}
    `));
    return (result.rows || result) as any[];
  } catch { return []; }
}

export function getVisualDiff(oldText: string, newText: string): string {
  if (!oldText && newText) return `➕ إضافة: "${newText.slice(0, 100)}"`;
  if (oldText && !newText) return `➖ حذف: "${oldText.slice(0, 100)}"`;

  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const changes: string[] = [];

  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < Math.min(maxLines, 10); i++) {
    if (oldLines[i] !== newLines[i]) {
      if (oldLines[i]) changes.push(`- ${oldLines[i].trim().slice(0, 80)}`);
      if (newLines[i]) changes.push(`+ ${newLines[i].trim().slice(0, 80)}`);
    }
  }
  if (maxLines > 10) changes.push(`... و ${maxLines - 10} أسطر أخرى`);
  return changes.join("\n") || "لا فرق";
}
