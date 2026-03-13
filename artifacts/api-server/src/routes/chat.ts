import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { projectsTable, usersTable, projectFilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "../middlewares/permissions";

const router: IRouter = Router();

interface ChatRequest {
  projectId: string;
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

const AGENT_SYSTEM_PROMPT = `أنت وكيل برمجة ذكي ومحترف لمنصة بناء مواقع. أنت المدير التنفيذي — تفهم وتنفذ وتناقش وتنصح.

يجب أن ترد دائماً بـ JSON فقط بالشكل التالي:
{"reply": "ردك هنا", "action": "build" أو "chat"}

- action = "build": عندما المستخدم يريد إنشاء/تعديل/بناء/تنفيذ أي شيء
- action = "chat": عندما المستخدم يسأل سؤال أو يناقش أو يستشير

أمثلة:
- "اعمل لي موقع بيع سيارات" → {"reply": "حاضر، سأبدأ بناء موقع بيع سيارات الآن", "action": "build"}
- "نفذ" → {"reply": "تمام، أبدأ التنفيذ الآن", "action": "build"}
- "ابدأ" → {"reply": "حاضر، أبدأ العمل", "action": "build"}
- "غير اللون للأزرق" → {"reply": "سأغير اللون للأزرق", "action": "build"}
- "ما رأيك بالتصميم؟" → {"reply": "التصميم جيد، أقترح تحسين...", "action": "chat"}
- "كيف حالك" → {"reply": "أهلاً! أنا جاهز للعمل", "action": "chat"}

قواعد:
- كن مختصراً — جملة أو جملتين كحد أقصى
- تحدث بلغة المستخدم
- لا تولّد كود في الرد
- كن واثقاً ومباشراً
- أجب بـ JSON فقط، بدون أي نص خارج الـ JSON`;

router.post("/chat/message", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { projectId, message, history } = req.body as ChatRequest;

    if (!message?.trim()) {
      res.status(400).json({ error: { code: "VALIDATION", message: "Message is required" } });
      return;
    }

    const [project] = projectId
      ? await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1)
      : [null];

    const [user] = await db
      .select({ creditBalanceUsd: usersTable.creditBalanceUsd })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    const credits = parseFloat(user?.creditBalanceUsd ?? "0");
    if (credits <= 0) {
      res.status(402).json({
        error: {
          code: "INSUFFICIENT_CREDITS",
          message: "Insufficient credits.",
          message_ar: "رصيد غير كافٍ.",
        },
      });
      return;
    }

    let contextInfo = "";
    if (project) {
      contextInfo = `\n\nسياق المشروع:
- اسم المشروع: ${project.name}
- الحالة: ${project.status}
- الوصف: ${project.description || "بدون وصف"}`;

      const files = await db
        .select({ filePath: projectFilesTable.filePath })
        .from(projectFilesTable)
        .where(eq(projectFilesTable.projectId, projectId));
      if (files.length > 0) {
        contextInfo += `\n- ملفات موجودة: ${files.map(f => f.filePath).join(", ")}`;
      }
    }

    const messages: { role: "user" | "assistant"; content: string }[] = [];

    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 256,
      system: AGENT_SYSTEM_PROMPT + contextInfo,
      messages,
    });

    const rawReply = response.content
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { type: string; text: string }) => block.text)
      .join("");

    let reply = "";
    let shouldBuild = false;

    try {
      const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        reply = parsed.reply || rawReply;
        shouldBuild = parsed.action === "build";
      } else {
        reply = rawReply;
      }
    } catch {
      reply = rawReply;
    }

    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
    const costUsd = tokensUsed * 0.000015;

    await db
      .update(usersTable)
      .set({
        creditBalanceUsd: String(Math.max(0, credits - costUsd)),
      })
      .where(eq(usersTable.id, userId));

    res.json({
      reply,
      shouldBuild,
      buildPrompt: shouldBuild ? message : undefined,
      tokensUsed,
      costUsd: parseFloat(costUsd.toFixed(6)),
    });
  } catch (error: unknown) {
    console.error("Chat error:", error);
    const message = error instanceof Error ? error.message : "Chat failed";
    res.status(500).json({ error: { code: "CHAT_ERROR", message } });
  }
});

export default router;
