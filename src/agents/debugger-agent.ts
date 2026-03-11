import { getDebuggerProvider } from "../llm/provider-factory";

export class DebuggerAgent {
  private collectLocalNotes(error: string): string[] {
    const notes: string[] = [];

    if (error.includes("Cannot find module")) {
      notes.push("Missing dependency or missing file");
    }

    if (error.includes("SyntaxError")) {
      notes.push("Syntax error in generated code");
    }

    if (error.includes("Unknown file extension")) {
      notes.push("Execution engine selected an unsupported runtime for the generated file type");
    }

    if (error.includes("timeout")) {
      notes.push("Execution exceeded allowed time limit");
    }

    if (error.includes("No executable entry file found")) {
      notes.push("Generated files do not contain a runnable entry point");
      notes.push("Expected one of: src/app.ts, src/index.ts, app.ts, index.ts, src/app.js, src/index.js, app.js, index.js");
    }

    if (error.includes("ENOENT")) {
      notes.push("File or directory not found");
    }

    if (error.includes("EACCES") || error.includes("Permission denied")) {
      notes.push("Permission denied when accessing a file or directory");
    }

    if (error.includes("TypeError")) {
      notes.push("Type error — likely accessing a property on undefined or null");
    }

    if (error.includes("ReferenceError")) {
      notes.push("Reference error — using a variable that was not declared");
    }

    return notes;
  }

  async run(error: string): Promise<string[]> {
    const localNotes = this.collectLocalNotes(error);

    const provider = getDebuggerProvider();
    if (!provider.isConfigured()) {
      return localNotes.length > 0 ? localNotes : ["Unknown execution failure"];
    }

    try {
      const result = await provider.generate({
        messages: [
          {
            role: "system" as const,
            content: [
              "You are an expert debugger and error analyst.",
              "You receive an error message or log from a code generation/execution system.",
              "Analyze the root cause and provide actionable suggestions to fix it.",
              "Return only valid JSON.",
              "JSON shape:",
              "{",
              '  "rootCause": "clear explanation of what caused the error",',
              '  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],',
              '  "severity": "critical|high|medium|low",',
              '  "affectedFiles": ["file1.ts", "file2.html"]',
              "}",
              "Rules:",
              "- Be specific and actionable",
              "- Suggest concrete code fixes when possible",
              "- no markdown, no explanation outside JSON",
            ].join("\n"),
          },
          {
            role: "user" as const,
            content: `Error to analyze:\n${error}\n\nLocal analysis notes:\n${localNotes.join("\n")}`,
          },
        ],
        maxTokens: 2000,
        temperature: 0.1,
        jsonMode: false,
      });

      if (!result.ok || !result.text) {
        return localNotes.length > 0 ? localNotes : ["Unknown execution failure"];
      }

      let textToParse = result.text;
      const jsonMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) textToParse = jsonMatch[1].trim();

      const parsed = JSON.parse(textToParse);
      const aiSuggestions: string[] = [];

      if (parsed.rootCause) {
        aiSuggestions.push(`Root cause: ${parsed.rootCause}`);
      }

      if (Array.isArray(parsed.suggestions)) {
        aiSuggestions.push(...parsed.suggestions);
      }

      if (parsed.severity) {
        aiSuggestions.push(`Severity: ${parsed.severity}`);
      }

      if (Array.isArray(parsed.affectedFiles) && parsed.affectedFiles.length > 0) {
        aiSuggestions.push(`Affected files: ${parsed.affectedFiles.join(", ")}`);
      }

      return aiSuggestions.length > 0 ? aiSuggestions : localNotes.length > 0 ? localNotes : ["Unknown execution failure"];
    } catch {
      return localNotes.length > 0 ? localNotes : ["Unknown execution failure"];
    }
  }
}
