import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  projectLanguagesTable,
  translationsTable,
  projectFilesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireProjectAccess, getUserId } from "../middlewares/permissions";
import { TranslationAgent } from "../lib/agents/translation-agent";
import { getConstitution } from "../lib/agents/constitution";

const router: IRouter = Router();

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nameAr: "الإنجليزية", rtl: false },
  { code: "ar", name: "Arabic", nameAr: "العربية", rtl: true },
  { code: "fr", name: "French", nameAr: "الفرنسية", rtl: false },
  { code: "es", name: "Spanish", nameAr: "الإسبانية", rtl: false },
  { code: "de", name: "German", nameAr: "الألمانية", rtl: false },
  { code: "tr", name: "Turkish", nameAr: "التركية", rtl: false },
  { code: "zh", name: "Chinese", nameAr: "الصينية", rtl: false },
  { code: "ja", name: "Japanese", nameAr: "اليابانية", rtl: false },
  { code: "ko", name: "Korean", nameAr: "الكورية", rtl: false },
  { code: "pt", name: "Portuguese", nameAr: "البرتغالية", rtl: false },
  { code: "ru", name: "Russian", nameAr: "الروسية", rtl: false },
  { code: "hi", name: "Hindi", nameAr: "الهندية", rtl: false },
  { code: "ur", name: "Urdu", nameAr: "الأردية", rtl: true },
  { code: "he", name: "Hebrew", nameAr: "العبرية", rtl: true },
  { code: "fa", name: "Persian", nameAr: "الفارسية", rtl: true },
];

router.get("/translations/languages", (_req, res) => {
  res.json({ data: SUPPORTED_LANGUAGES });
});

router.get(
  "/projects/:projectId/languages",
  requireProjectAccess("project.view"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const languages = await db
        .select()
        .from(projectLanguagesTable)
        .where(eq(projectLanguagesTable.projectId, projectId));
      res.json({ data: languages });
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL", message: "Failed to list project languages" } });
    }
  }
);

router.post(
  "/projects/:projectId/languages",
  requireProjectAccess("project.edit"),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { languageCode, languageName, isDefault, isRtl } = req.body;

      if (!languageCode || !languageName) {
        res.status(400).json({ error: { code: "VALIDATION", message: "languageCode and languageName are required" } });
        return;
      }

      const supportedLang = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
      if (!supportedLang) {
        res.status(400).json({ error: { code: "VALIDATION", message: "Unsupported language code" } });
        return;
      }

      const existing = await db
        .select()
        .from(projectLanguagesTable)
        .where(eq(projectLanguagesTable.projectId, projectId));

      if (existing.length >= 10) {
        res.status(400).json({ error: { code: "LIMIT", message: "Maximum 10 languages per project" } });
        return;
      }

      const duplicate = existing.find((l) => l.languageCode === languageCode);
      if (duplicate) {
        res.status(400).json({ error: { code: "DUPLICATE", message: "Language already added" } });
        return;
      }

      const shouldBeDefault = isDefault || existing.length === 0;

      if (shouldBeDefault && existing.some((l) => l.isDefault === 1)) {
        await db
          .update(projectLanguagesTable)
          .set({ isDefault: 0 })
          .where(
            and(
              eq(projectLanguagesTable.projectId, projectId),
              eq(projectLanguagesTable.isDefault, 1)
            )
          );
      }

      const [language] = await db
        .insert(projectLanguagesTable)
        .values({
          projectId,
          languageCode,
          languageName: supportedLang.name,
          isDefault: shouldBeDefault ? 1 : 0,
          isRtl: supportedLang.rtl ? 1 : 0,
        })
        .returning();

      res.json({ data: language });
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL", message: "Failed to add language" } });
    }
  }
);

router.delete(
  "/projects/:projectId/languages/:languageCode",
  requireProjectAccess("project.edit"),
  async (req, res) => {
    try {
      const { projectId, languageCode } = req.params;

      const langToDelete = await db
        .select()
        .from(projectLanguagesTable)
        .where(
          and(
            eq(projectLanguagesTable.projectId, projectId),
            eq(projectLanguagesTable.languageCode, languageCode)
          )
        );

      await db
        .delete(translationsTable)
        .where(
          and(
            eq(translationsTable.projectId, projectId),
            eq(translationsTable.languageCode, languageCode)
          )
        );

      await db
        .delete(projectLanguagesTable)
        .where(
          and(
            eq(projectLanguagesTable.projectId, projectId),
            eq(projectLanguagesTable.languageCode, languageCode)
          )
        );

      if (langToDelete[0]?.isDefault === 1) {
        const remaining = await db
          .select()
          .from(projectLanguagesTable)
          .where(eq(projectLanguagesTable.projectId, projectId))
          .limit(1);

        if (remaining.length > 0) {
          await db
            .update(projectLanguagesTable)
            .set({ isDefault: 1 })
            .where(eq(projectLanguagesTable.id, remaining[0].id));
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL", message: "Failed to remove language" } });
    }
  }
);

router.get(
  "/projects/:projectId/translations/:languageCode",
  requireProjectAccess("project.view"),
  async (req, res) => {
    try {
      const { projectId, languageCode } = req.params;
      const translations = await db
        .select()
        .from(translationsTable)
        .where(
          and(
            eq(translationsTable.projectId, projectId),
            eq(translationsTable.languageCode, languageCode)
          )
        );
      res.json({ data: translations });
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL", message: "Failed to list translations" } });
    }
  }
);

router.patch(
  "/projects/:projectId/translations/:translationId",
  requireProjectAccess("project.edit"),
  async (req, res) => {
    try {
      const { projectId, translationId } = req.params;
      const { translatedText } = req.body;

      if (!translatedText) {
        res.status(400).json({ error: { code: "VALIDATION", message: "translatedText is required" } });
        return;
      }

      const [updated] = await db
        .update(translationsTable)
        .set({ translatedText, status: "manual", updatedAt: new Date() })
        .where(
          and(
            eq(translationsTable.id, translationId),
            eq(translationsTable.projectId, projectId)
          )
        )
        .returning();

      if (!updated) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Translation not found" } });
        return;
      }

      res.json({ data: updated });
    } catch (error) {
      res.status(500).json({ error: { code: "INTERNAL", message: "Failed to update translation" } });
    }
  }
);

router.post(
  "/projects/:projectId/translate/:languageCode",
  requireProjectAccess("project.edit"),
  async (req, res) => {
    try {
      const { projectId, languageCode } = req.params;
      const userId = getUserId(req);

      const languages = await db
        .select()
        .from(projectLanguagesTable)
        .where(eq(projectLanguagesTable.projectId, projectId));

      const targetLang = languages.find((l) => l.languageCode === languageCode);
      if (!targetLang) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Language not configured for this project" } });
        return;
      }

      const defaultLang = languages.find((l) => l.isDefault === 1);
      if (!defaultLang) {
        res.status(400).json({ error: { code: "NO_DEFAULT", message: "No default language configured" } });
        return;
      }

      const files = await db
        .select()
        .from(projectFilesTable)
        .where(eq(projectFilesTable.projectId, projectId));

      const htmlFiles = files.filter((f) => f.filePath.endsWith(".html"));
      if (htmlFiles.length === 0) {
        res.status(400).json({ error: { code: "NO_CONTENT", message: "No HTML files found to translate" } });
        return;
      }

      const contentEntries = extractTextContent(htmlFiles);
      if (contentEntries.length === 0) {
        res.status(400).json({ error: { code: "NO_CONTENT", message: "No translatable content found" } });
        return;
      }

      const translationAgent = new TranslationAgent(getConstitution());
      const buildContext = {
        buildId: `translate-${Date.now()}`,
        projectId,
        userId,
        prompt: "",
        existingFiles: [],
        tokensUsedSoFar: 0,
      };

      const sourceLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === defaultLang.languageCode);
      const targetLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);

      const results = await translationAgent.translateContent(
        {
          sourceLanguage: sourceLangInfo?.name || defaultLang.languageName,
          targetLanguage: targetLangInfo?.name || targetLang.languageName,
          contentEntries,
          websiteContext: `Website project with files: ${files.map((f) => f.filePath).join(", ")}`,
        },
        buildContext
      );

      const upsertedTranslations = [];
      for (const result of results) {
        const sourceEntry = contentEntries.find((e) => e.key === result.key);
        if (!sourceEntry) continue;

        const existing = await db
          .select()
          .from(translationsTable)
          .where(
            and(
              eq(translationsTable.projectId, projectId),
              eq(translationsTable.languageCode, languageCode),
              eq(translationsTable.contentKey, result.key)
            )
          );

        if (existing.length > 0 && existing[0].status === "manual") {
          upsertedTranslations.push(existing[0]);
          continue;
        }

        if (existing.length > 0) {
          const [updated] = await db
            .update(translationsTable)
            .set({
              translatedText: result.translatedText,
              sourceText: sourceEntry.text,
              status: "auto",
              updatedAt: new Date(),
            })
            .where(eq(translationsTable.id, existing[0].id))
            .returning();
          upsertedTranslations.push(updated);
        } else {
          const [inserted] = await db
            .insert(translationsTable)
            .values({
              projectId,
              languageCode,
              contentKey: result.key,
              sourceText: sourceEntry.text,
              translatedText: result.translatedText,
              status: "auto",
            })
            .returning();
          upsertedTranslations.push(inserted);
        }
      }

      res.json({ data: upsertedTranslations, count: upsertedTranslations.length });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ error: { code: "INTERNAL", message: "Translation failed" } });
    }
  }
);

function extractTextContent(
  htmlFiles: { filePath: string; content: string }[]
): { key: string; text: string }[] {
  const entries: { key: string; text: string }[] = [];
  const seen = new Set<string>();

  for (const file of htmlFiles) {
    const textRegex = />([^<>{}\n]+)</g;
    let match;
    while ((match = textRegex.exec(file.content)) !== null) {
      const text = match[1].trim();
      if (
        text.length >= 2 &&
        !/^[\s\d.,;:!?@#$%^&*()[\]{}|\\/<>+=_~`"'-]+$/.test(text) &&
        !seen.has(text)
      ) {
        seen.add(text);
        const key = `${file.filePath}::${entries.length}`;
        entries.push({ key, text });
      }
    }

    const placeholderRegex = /placeholder=["']([^"']+)["']/g;
    while ((match = placeholderRegex.exec(file.content)) !== null) {
      const text = match[1].trim();
      if (text.length >= 2 && !seen.has(text)) {
        seen.add(text);
        const key = `${file.filePath}::placeholder::${entries.length}`;
        entries.push({ key, text });
      }
    }

    const titleRegex = /<title>([^<]+)<\/title>/gi;
    while ((match = titleRegex.exec(file.content)) !== null) {
      const text = match[1].trim();
      if (text.length >= 2 && !seen.has(text)) {
        seen.add(text);
        const key = `${file.filePath}::title::${entries.length}`;
        entries.push({ key, text });
      }
    }

    const altRegex = /alt=["']([^"']+)["']/g;
    while ((match = altRegex.exec(file.content)) !== null) {
      const text = match[1].trim();
      if (text.length >= 2 && !seen.has(text)) {
        seen.add(text);
        const key = `${file.filePath}::alt::${entries.length}`;
        entries.push({ key, text });
      }
    }
  }

  return entries;
}

export default router;
