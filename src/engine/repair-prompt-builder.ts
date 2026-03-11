export function buildRepairPrompt(params: {
  originalPrompt: string;
  plan?: any;
  intent?: any;
  files: Array<{ path: string; content: string }>;
  review?: any;
  executionError?: string;
  attempt: number;
}) {
  const filesPreview = params.files.map((file) => ({
    path: file.path,
    content: file.content.slice(0, 6000),
  }));

  return [
    {
      role: "system" as const,
      content:
        [
          "You are a senior software repair agent.",
          "Return only valid JSON.",
          "Fix the provided project files based on the execution/review failure.",
          "Preserve alignment with the original product intent.",
          "Do not explain. Do not use markdown.",
          "Return JSON in this shape:",
          "{",
          '  "files": [',
          '    { "path": "index.html", "content": "..." }',
          "  ]",
          "}",
          "Rules:",
          "- preserve project intent",
          "- keep files previewable",
          "- do not return prose",
          "- update only what is necessary",
        ].join("\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          originalPrompt: params.originalPrompt,
          plan: params.plan ?? null,
          intent: params.intent ?? null,
          review: params.review ?? null,
          executionError: params.executionError ?? null,
          attempt: params.attempt,
          files: filesPreview,
        },
        null,
        2
      ),
    },
  ];
}
