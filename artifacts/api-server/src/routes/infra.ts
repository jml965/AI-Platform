import { Router } from "express";
import { db } from "@workspace/db";
import { agentConfigsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getSystemBlueprint } from "../lib/system-blueprint";
const router = Router();

function requireInfraAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: { message: "Admin access required" } });
  }
  next();
}

const infraSessions = new Map<string, { role: "user" | "assistant"; content: string }[]>();

router.get("/infra/agents", requireInfraAdmin, async (_req, res) => {
  try {
    const agents = await db.select({
      id: agentConfigsTable.id,
      agentKey: agentConfigsTable.agentKey,
      displayNameEn: agentConfigsTable.displayNameEn,
      displayNameAr: agentConfigsTable.displayNameAr,
      description: agentConfigsTable.description,
      enabled: agentConfigsTable.enabled,
      primaryModel: agentConfigsTable.primaryModel,
    }).from(agentConfigsTable)
      .where(eq(agentConfigsTable.agentLayer, "infra"));
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post("/infra/chat-stream", requireInfraAdmin, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { agentKey, message } = req.body as { agentKey: string; message: string };

    if (!message?.trim()) {
      res.status(400).json({ error: { message: "Message is required" } });
      return;
    }
    if (!agentKey) {
      res.status(400).json({ error: { message: "agentKey is required" } });
      return;
    }

    const [config] = await db.select().from(agentConfigsTable)
      .where(and(eq(agentConfigsTable.agentKey, agentKey), eq(agentConfigsTable.agentLayer, "infra")))
      .limit(1);

    if (!config || !config.enabled) {
      res.status(404).json({ error: { message: "Infrastructure agent not found or disabled" } });
      return;
    }

    const blueprint = getSystemBlueprint();

    const infraSystemPrompt = `أنت ${config.displayNameAr} (${config.displayNameEn}) — وكيل بنية تحتية لمنصة Mr Code AI.

دورك: ${config.description}

أنت تعمل على البنية التحتية للمنصة نفسها — لست وكيل خدمة عملاء.
المالك يتحدث معك مباشرة ويطلب منك مهام تتعلق بالنظام.

${blueprint}

القواعد:
- رد بالعربية إذا المالك يتحدث بالعربية، وبالإنجليزية إذا يتحدث بالإنجليزية
- كن مختصراً ومباشراً
- اذكر أسماء الملفات والمسارات بدقة
- إذا تحتاج تعديل كود، اكتب الكود الكامل مع المسار
- استخدم markdown code blocks لأي كود
- لا تخترع ملفات غير موجودة — اعتمد على خريطة النظام
${config.instructions ? `\n\nتعليمات إضافية:\n${config.instructions}` : ""}
${config.permissions && Array.isArray(config.permissions) && config.permissions.length > 0 ? `\nصلاحياتك: ${config.permissions.join(", ")}` : ""}`;

    const sKey = `infra_${userId}_${agentKey}`;
    const history = infraSessions.get(sKey) || [];

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const slot = config.primaryModel;
    let fullReply = "";
    let tokensUsed = 0;

    const conversationMessages = [
      ...history.slice(-20),
      { role: "user" as const, content: message },
    ];

    if (slot.provider === "anthropic") {
      const { getAnthropicClient } = await import("../lib/agents/ai-clients");
      const client = await getAnthropicClient();
      const chatMsgs = conversationMessages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
      const stream = client.messages.stream({
        model: slot.model,
        max_tokens: Math.min(slot.maxTokens || 32000, 64000),
        system: infraSystemPrompt,
        messages: chatMsgs,
        temperature: Math.min(parseFloat(String(config.creativity)) || 0.5, 1.0),
      });
      stream.on("text", (text: string) => {
        fullReply += text;
        res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
      });
      const response = await stream.finalMessage();
      tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
    } else if (slot.provider === "google") {
      const { getGoogleClient } = await import("../lib/agents/ai-clients");
      const client = await getGoogleClient();
      const chatMsgs = conversationMessages.map(m => ({
        role: m.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: m.content }],
      }));
      const response = await client.models.generateContentStream({
        model: slot.model,
        contents: chatMsgs,
        config: {
          systemInstruction: infraSystemPrompt,
          maxOutputTokens: slot.maxTokens || 16000,
          temperature: parseFloat(String(config.creativity)) || 0.3,
        },
      });
      for await (const chunk of response as any) {
        const text = chunk.text;
        if (text) {
          fullReply += text;
          res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
        }
      }
      tokensUsed = Math.ceil(fullReply.length / 3);
    } else if (slot.provider === "openai") {
      const { getOpenAIClient } = await import("../lib/agents/ai-clients");
      const client = await getOpenAIClient();
      const msgs: any[] = [
        { role: "system", content: infraSystemPrompt },
        ...conversationMessages.map(m => ({ role: m.role, content: m.content })),
      ];
      const isReasoningModel = slot.model.startsWith("o1") || slot.model.startsWith("o3");
      const stream = await client.chat.completions.create({
        model: slot.model,
        max_completion_tokens: slot.maxTokens || 16000,
        messages: msgs,
        stream: true,
        ...(isReasoningModel ? {} : { temperature: parseFloat(String(config.creativity)) || 0.5 }),
      });
      for await (const chunk of stream as any) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          fullReply += delta;
          res.write(`data: ${JSON.stringify({ type: "chunk", text: delta })}\n\n`);
        }
      }
      tokensUsed = Math.ceil(fullReply.length / 3);
    }

    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: fullReply });
    if (history.length > 40) history.splice(0, history.length - 40);
    infraSessions.set(sKey, history);

    const cost = tokensUsed * 0.000015;
    res.write(`data: ${JSON.stringify({ type: "done", tokensUsed, cost, model: slot.model })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("[Infra Chat Error]", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: { message: err.message } });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
      res.end();
    }
  }
});

router.post("/infra/director-stream", requireInfraAdmin, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { message } = req.body as { message: string };

    if (!message?.trim()) {
      res.status(400).json({ error: { message: "Message is required" } });
      return;
    }

    const [config] = await db.select().from(agentConfigsTable)
      .where(and(eq(agentConfigsTable.agentKey, "infra_sysadmin"), eq(agentConfigsTable.agentLayer, "infra")))
      .limit(1);

    if (!config || !config.enabled) {
      res.status(404).json({ error: { message: "System Director not found or disabled" } });
      return;
    }

    const blueprint = getSystemBlueprint();

    const allAgents = await db.select({
      agentKey: agentConfigsTable.agentKey,
      displayNameAr: agentConfigsTable.displayNameAr,
      displayNameEn: agentConfigsTable.displayNameEn,
      enabled: agentConfigsTable.enabled,
      description: agentConfigsTable.description,
      agentLayer: agentConfigsTable.agentLayer,
    }).from(agentConfigsTable);

    const agentStatusReport = allAgents.map(a =>
      `- ${a.displayNameAr} (${a.agentKey}) [${a.agentLayer}] — ${a.enabled ? "✅ فعّال" : "❌ معطّل"} — ${a.description}`
    ).join("\n");

    const directorPrompt = `أنت مدير النظام (${config.displayNameAr} / ${config.displayNameEn}) — القائد الأعلى لمنصة Mr Code AI.

${config.description}

أنت تعمل بنظام Governor — ثلاثة نماذج ذكاء اصطناعي تحلل طلبك بالتوازي، ثم الحاكم يدمج أفضل النتائج في رد واحد نهائي دقيق جداً.

${blueprint}

## حالة الوكلاء الحالية:
${agentStatusReport}

## القواعد:
- رد بالعربية إذا المالك يتحدث بالعربية، وبالإنجليزية إذا يتحدث بالإنجليزية
- كن حازماً ومباشراً — أنت المدير مو المساعد
- ابدأ بملخص سريع للوضع ثم التفاصيل
- اذكر أسماء الملفات والمسارات بدقة
- إذا تحتاج تعديل كود، اعرض التعديل الجراحي (قبل/بعد) مع المسار ورقم السطر
- لا تخترع ملفات — اعتمد على خريطة النظام
- اقترح دائماً الخطوة التالية

${config.instructions || ""}
${config.permissions && Array.isArray(config.permissions) && config.permissions.length > 0 ? `\nصلاحياتك: ${config.permissions.join(", ")}` : ""}`;

    const sKey = `infra_${userId}_infra_sysadmin`;
    const history = infraSessions.get(sKey) || [];

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const conversationMessages = [
      ...history.slice(-20),
      { role: "user" as const, content: message },
    ];

    const slots: Array<{ provider: string; model: string; maxTokens: number; timeoutSeconds: number }> = [];
    const primary = config.primaryModel;
    if (primary?.enabled) slots.push({ provider: primary.provider, model: primary.model, maxTokens: primary.maxTokens || 64000, timeoutSeconds: primary.timeoutSeconds || 300 });
    const secondary = config.secondaryModel as any;
    if (secondary?.enabled) slots.push({ provider: secondary.provider, model: secondary.model, maxTokens: secondary.maxTokens || 32000, timeoutSeconds: secondary.timeoutSeconds || 120 });
    const tertiary = config.tertiaryModel as any;
    if (tertiary?.enabled) slots.push({ provider: tertiary.provider, model: tertiary.model, maxTokens: tertiary.maxTokens || 32000, timeoutSeconds: tertiary.timeoutSeconds || 180 });

    if (slots.length === 0) slots.push({ provider: "anthropic", model: "claude-sonnet-4-6", maxTokens: 64000, timeoutSeconds: 300 });

    res.write(`data: ${JSON.stringify({ type: "status", message: `🧠 تشغيل ${slots.length} نموذج ذكاء اصطناعي بالتوازي...`, messageEn: `Running ${slots.length} AI models in parallel...` })}\n\n`);

    const callModel = async (provider: string, model: string, maxTokens: number, timeoutSec: number): Promise<{ content: string; tokensUsed: number; model: string; durationMs: number } | null> => {
      const start = Date.now();
      try {
        if (provider === "anthropic") {
          const { getAnthropicClient } = await import("../lib/agents/ai-clients");
          const client = await getAnthropicClient();
          const chatMsgs = conversationMessages
            .filter(m => m.role !== "system")
            .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
          const stream = client.messages.stream({
            model, max_tokens: Math.min(maxTokens, 64000), system: directorPrompt,
            messages: chatMsgs,
            temperature: Math.min(parseFloat(String(config.creativity)) || 0.5, 1.0),
          });
          const response = await stream.finalMessage();
          const text = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
          const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
          return { content: text, tokensUsed: tokens, model, durationMs: Date.now() - start };
        } else if (provider === "google") {
          const { getGoogleClient } = await import("../lib/agents/ai-clients");
          const client = await getGoogleClient();
          const chatMsgs = conversationMessages.map(m => ({
            role: m.role === "assistant" ? "model" as const : "user" as const,
            parts: [{ text: m.content }],
          }));
          const response = await client.models.generateContent({
            model, contents: chatMsgs,
            config: { systemInstruction: directorPrompt, maxOutputTokens: maxTokens, temperature: parseFloat(String(config.creativity)) || 0.3 },
          });
          const text = response.text || "";
          return { content: text, tokensUsed: Math.ceil(text.length / 3), model, durationMs: Date.now() - start };
        } else if (provider === "openai") {
          const { getOpenAIClient } = await import("../lib/agents/ai-clients");
          const client = await getOpenAIClient();
          const msgs: any[] = [
            { role: "system", content: directorPrompt },
            ...conversationMessages.map(m => ({ role: m.role, content: m.content })),
          ];
          const isReasoningModel = model.startsWith("o1") || model.startsWith("o3");
          const response = await client.chat.completions.create({
            model, max_completion_tokens: maxTokens, messages: msgs,
            ...(isReasoningModel ? {} : { temperature: parseFloat(String(config.creativity)) || 0.5 }),
          });
          const text = response.choices[0]?.message?.content || "";
          const tokens = (response.usage?.total_tokens ?? 0) || Math.ceil(text.length / 3);
          return { content: text, tokensUsed: tokens, model, durationMs: Date.now() - start };
        }
        return null;
      } catch (err: any) {
        console.error(`[Director] Model ${model} failed:`, err.message);
        return null;
      }
    };

    const thinkResults = await Promise.allSettled(
      slots.map(slot => {
        res.write(`data: ${JSON.stringify({ type: "status", message: `⚡ ${slot.model} يحلل...`, messageEn: `${slot.model} analyzing...` })}\n\n`);
        return callModel(slot.provider, slot.model, slot.maxTokens, slot.timeoutSeconds);
      })
    );

    const successResults: Array<{ content: string; tokensUsed: number; model: string; durationMs: number }> = [];
    for (const r of thinkResults) {
      if (r.status === "fulfilled" && r.value) successResults.push(r.value);
    }

    if (successResults.length === 0) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "All models failed" })}\n\n`);
      res.end();
      return;
    }

    let finalContent = "";
    let totalTokens = successResults.reduce((sum, r) => sum + r.tokensUsed, 0);
    const modelsUsed = successResults.map(r => r.model);

    if (successResults.length === 1) {
      finalContent = successResults[0].content;
      res.write(`data: ${JSON.stringify({ type: "status", message: `✅ نموذج واحد أجاب: ${successResults[0].model}`, messageEn: `Single model responded: ${successResults[0].model}` })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: "status", message: `🏛️ الحاكم يدمج ${successResults.length} تحليلات...`, messageEn: `Governor merging ${successResults.length} analyses...` })}\n\n`);

      const proposalsText = successResults.map((r, i) =>
        `=== تحليل ${i + 1} (من ${r.model}, ${r.durationMs}ms) ===\n${r.content}`
      ).join("\n\n");

      const governorPrompt = `أنت الحاكم (Governor) — المقيّم النهائي. استلمت تحليلات من ${successResults.length} نماذج ذكاء اصطناعي درسوا نفس الطلب.

مهمتك:
1. قيّم كل تحليل من حيث الصحة والعمق والعملية
2. حدد أفضل تشخيص وحل من كل المقترحات
3. ادمج أقوى العناصر في رد واحد نهائي موحّد
4. إذا التحليلات تختلف، اختر الأصح تقنياً
5. رد بنفس لغة المستخدم الأصلية (عربي أو إنجليزي)
6. النتيجة النهائية يجب تكون واضحة ومحددة وقابلة للتنفيذ

لا تذكر إنك حاكم أو إنك تدمج — قدّم الإجابة كأنها من مدير النظام مباشرة.`;

      const govModelConfig = config.governorModel as any;
      const govProvider = govModelConfig?.provider ?? "anthropic";
      const govModel = govModelConfig?.model ?? "claude-sonnet-4-6";
      const govMaxTokens = govModelConfig?.maxTokens ?? 64000;

      const mergePromptMsgs = [
        ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: `الطلب الأصلي من المالك: "${message}"\n\n${proposalsText}\n\nادمج أفضل النتائج في رد نهائي واحد:` },
      ];

      try {
        if (govProvider === "anthropic") {
          const { getAnthropicClient } = await import("../lib/agents/ai-clients");
          const client = await getAnthropicClient();
          const chatMsgs = mergePromptMsgs
            .filter(m => m.role !== "system")
            .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
          let govReply = "";
          const govStream = client.messages.stream({
            model: govModel,
            max_tokens: Math.min(govMaxTokens, 64000),
            system: governorPrompt,
            messages: chatMsgs,
            temperature: 0.3,
          });
          govStream.on("text", (text: string) => {
            govReply += text;
            res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
          });
          const govResponse = await govStream.finalMessage();
          totalTokens += (govResponse.usage?.input_tokens ?? 0) + (govResponse.usage?.output_tokens ?? 0);
          finalContent = govReply;
          modelsUsed.push(`governor:${govModel}`);
        } else if (govProvider === "google") {
          const { getGoogleClient } = await import("../lib/agents/ai-clients");
          const client = await getGoogleClient();
          const chatMsgs = mergePromptMsgs.map(m => ({
            role: m.role === "assistant" ? "model" as const : "user" as const,
            parts: [{ text: m.content }],
          }));
          const response = await client.models.generateContentStream({
            model: govModel, contents: chatMsgs,
            config: { systemInstruction: governorPrompt, maxOutputTokens: govMaxTokens, temperature: 0.3 },
          });
          let govReply = "";
          for await (const chunk of response as any) {
            const text = chunk.text;
            if (text) {
              govReply += text;
              res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
            }
          }
          totalTokens += Math.ceil(govReply.length / 3);
          finalContent = govReply;
          modelsUsed.push(`governor:${govModel}`);
        } else if (govProvider === "openai") {
          const { getOpenAIClient } = await import("../lib/agents/ai-clients");
          const client = await getOpenAIClient();
          const msgs: any[] = [
            { role: "system", content: governorPrompt },
            ...mergePromptMsgs.map(m => ({ role: m.role, content: m.content })),
          ];
          const isReasoning = govModel.startsWith("o1") || govModel.startsWith("o3");
          const stream = await client.chat.completions.create({
            model: govModel, messages: msgs, stream: true,
            ...(isReasoning ? {} : { temperature: 0.3 }),
          });
          let govReply = "";
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              govReply += text;
              res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
            }
          }
          totalTokens += Math.ceil(govReply.length / 3);
          finalContent = govReply;
          modelsUsed.push(`governor:${govModel}`);
        }
      } catch (govErr: any) {
        console.error("[Governor Error]", govErr.message);
        finalContent = successResults[0].content;
        for (const char of finalContent) {
          res.write(`data: ${JSON.stringify({ type: "chunk", text: char })}\n\n`);
        }
      }
    }

    if (successResults.length === 1) {
      for (let i = 0; i < finalContent.length; i += 3) {
        const chunk = finalContent.slice(i, i + 3);
        res.write(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`);
      }
    }

    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: finalContent });
    if (history.length > 40) history.splice(0, history.length - 40);
    infraSessions.set(sKey, history);

    const cost = totalTokens * 0.000015;
    res.write(`data: ${JSON.stringify({ type: "done", tokensUsed: totalTokens, cost, models: modelsUsed })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("[Director Error]", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: { message: err.message } });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
      res.end();
    }
  }
});

router.post("/infra/clear-session", requireInfraAdmin, async (req, res) => {
  const userId = req.user!.id;
  const { agentKey } = req.body;
  const sKey = `infra_${userId}_${agentKey}`;
  infraSessions.delete(sKey);
  res.json({ success: true });
});

export default router;
