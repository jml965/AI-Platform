import {
  DeploymentTarget
} from "./deployment-intelligence-types";

import {
  DeploymentTargetScore
} from "./deployment-intelligence-advanced-types";

export function scoreTargets(targets: DeploymentTarget[]): DeploymentTargetScore[] {

  return targets.map(target => {

    let costScore = 0;
    let complexityScore = 0;
    let reliabilityScore = 0;

    switch (target) {

      case "vercel":
      case "netlify":
        costScore = 9;
        complexityScore = 9;
        reliabilityScore = 7;
        break;

      case "cloud-run":
        costScore = 7;
        complexityScore = 7;
        reliabilityScore = 9;
        break;

      case "railway":
      case "render":
        costScore = 8;
        complexityScore = 8;
        reliabilityScore = 7;
        break;

      case "fly-io":
        costScore = 7;
        complexityScore = 6;
        reliabilityScore = 8;
        break;

      case "vps-docker-nginx":
        costScore = 10;
        complexityScore = 5;
        reliabilityScore = 8;
        break;

      default:
        costScore = 6;
        complexityScore = 6;
        reliabilityScore = 6;
    }

    const overallScore = Math.round(
      (costScore + complexityScore + reliabilityScore) / 3
    );

    return {
      target,
      costScore,
      complexityScore,
      reliabilityScore,
      overallScore
    };

  });

}
