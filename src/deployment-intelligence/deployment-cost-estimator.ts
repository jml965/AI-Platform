import { DeploymentTarget } from "./deployment-intelligence-types";

export function estimateMonthlyCost(target: DeploymentTarget) {

  switch (target) {

    case "vercel":
    case "netlify":
      return { min: 0, max: 20 };

    case "railway":
    case "render":
      return { min: 7, max: 25 };

    case "cloud-run":
      return { min: 5, max: 40 };

    case "fly-io":
      return { min: 5, max: 30 };

    case "vps-docker-nginx":
      return { min: 5, max: 15 };

    case "docker-compose-vps":
      return { min: 5, max: 20 };

    default:
      return { min: 10, max: 50 };
  }
}
