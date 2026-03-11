export class RunMetrics {

  static computeTimeWorked(startedAt: number, finishedAt: number): number {
    const sec = Math.round((finishedAt - startedAt) / 1000);
    return Math.max(1, sec);
  }

  static computeActionsCount(filesGenerated?: number): number {
    if (!filesGenerated) return 0;
    return filesGenerated;
  }

  static computeCodeDelta(files?: any[]): {
    linesAdded: number;
    linesRemoved: number;
  } {
    if (!files || !Array.isArray(files)) {
      return { linesAdded: 0, linesRemoved: 0 };
    }

    let added = 0;
    let removed = 0;

    for (const file of files) {
      const content =
        typeof file?.content === "string"
          ? file.content
          : typeof file?.code === "string"
            ? file.code
            : "";

      if (!content) continue;

      const lines = content.split("\n").length;
      added += lines;
    }

    return {
      linesAdded: added,
      linesRemoved: removed
    };
  }

  static computeCost(tokens?: number, pricePer1k?: number): number {
    if (!tokens || !pricePer1k) {
      return 0;
    }
    const cost = (tokens / 1000) * pricePer1k;
    return Number(cost.toFixed(2));
  }

  static computeCostFromUsage(usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }): number {
    const inputTokens = Number(usage?.inputTokens || 0);
    const outputTokens = Number(usage?.outputTokens || 0);
    const totalTokens = Number(usage?.totalTokens || 0);

    const effectiveTotal = totalTokens || inputTokens + outputTokens;
    if (!effectiveTotal) return 0;

    const inputRate = Number(process.env.OPENAI_INPUT_1K_USD || 0);
    const outputRate = Number(process.env.OPENAI_OUTPUT_1K_USD || 0);

    if (inputRate > 0 || outputRate > 0) {
      const inputCost = (inputTokens / 1000) * inputRate;
      const outputCost = (outputTokens / 1000) * outputRate;
      return Number((inputCost + outputCost).toFixed(4));
    }

    const flatRate = Number(process.env.LLM_COST_1K_USD || 0);
    if (flatRate > 0) {
      return Number(((effectiveTotal / 1000) * flatRate).toFixed(4));
    }

    return 0;
  }

}
