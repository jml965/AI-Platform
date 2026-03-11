// FILE: src/lib/plan-normalizer.ts

export class PlanNormalizer {

  normalize(planRaw: any) {
    return {
      summary:
        typeof planRaw?.summary === "string"
          ? planRaw.summary
          : "No summary",

      steps: Array.isArray(planRaw?.steps)
        ? planRaw.steps.map((step: any) => {
            if (typeof step === "string") {
              return step
            }

            if (typeof step?.title === "string" && step.title.trim()) {
              return step.title
            }

            return "Unnamed step"
          })
        : []
    }
  }

}