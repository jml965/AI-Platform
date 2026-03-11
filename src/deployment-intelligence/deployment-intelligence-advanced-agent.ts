import {
  DeploymentRecommendation,
  DeploymentTarget
} from "./deployment-intelligence-types";

import {
  DeploymentAdvancedAnalysis
} from "./deployment-intelligence-advanced-types";

import { scoreTargets } from "./deployment-target-scorer";
import { estimateMonthlyCost } from "./deployment-cost-estimator";

export class DeploymentIntelligenceAdvancedAgent {

  analyze(recommendation: DeploymentRecommendation): DeploymentAdvancedAnalysis {

    const candidateTargets: DeploymentTarget[] = [
      recommendation.recommendedTarget,
      recommendation.fallbackTarget,
      "cloud-run",
      "railway",
      "render",
      "vps-docker-nginx"
    ];

    const scored = scoreTargets(candidateTargets);

    const best = scored.sort((a, b) => b.overallScore - a.overallScore)[0];

    const cheapest = scored.sort((a, b) => b.costScore - a.costScore)[0];

    const simplest = scored.sort((a, b) => b.complexityScore - a.complexityScore)[0];

    const reliable = scored.sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0];

    const cost = estimateMonthlyCost(best.target);

    return {
      confidenceScore: Math.min(100, best.overallScore * 10),
      bestTarget: best.target,
      cheapestTarget: cheapest.target,
      simplestTarget: simplest.target,
      mostReliableTarget: reliable.target,
      targets: scored,
      estimatedMonthlyCost: {
        min: cost.min,
        max: cost.max,
        currency: "USD"
      }
    };
  }
}
