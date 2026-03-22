process.on("uncaughtException", (err) => {
  if (err.message?.includes("before initialization")) {
    console.error("[TDZ ERROR]", err.message, err.stack?.split("\n").slice(0, 5).join("\n"));
  } else {
    console.error("[UNCAUGHT]", err.message);
  }
});

import { createServer } from "http";
import app from "./app";
import { seedRolesAndPermissions } from "./lib/seedRoles";
import { setupCollaborationWebSocket } from "./lib/collaboration";
import { handleSandboxWebSocketUpgrade } from "./routes/sandbox";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

seedRolesAndPermissions().catch((err) =>
  console.error("[Seed] Failed to seed roles:", err)
);

db.execute(sql`
  CREATE TABLE IF NOT EXISTS ui_text_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'ar',
    value TEXT NOT NULL,
    updated_by TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )
`).then(() => {
  return db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ui_text_overrides_key_lang_idx ON ui_text_overrides (key, lang)
  `);
}).then(() => {
  console.log("[DB] ui_text_overrides table ready");
}).catch((err: any) => {
  console.error("[DB] Failed to create ui_text_overrides:", err.message);
});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS ui_style_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    selector TEXT NOT NULL,
    property TEXT NOT NULL,
    value TEXT NOT NULL,
    page TEXT DEFAULT '*',
    updated_by TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )
`).then(() => {
  return db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ui_style_overrides_selector_prop_idx ON ui_style_overrides (selector, property)
  `);
}).then(() => {
  console.log("[DB] ui_style_overrides table ready");
}).catch((err: any) => {
  console.error("[DB] Failed to create ui_style_overrides:", err.message);
});

const server = createServer(app);

server.on("upgrade", (req, socket, head) => {
  const url = req.url || "";
  if (url.startsWith("/api/sandbox/proxy/")) {
    handleSandboxWebSocketUpgrade(req, socket, head).catch(() => {
      socket.destroy();
    });
    return;
  }
});

setupCollaborationWebSocket(server);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
