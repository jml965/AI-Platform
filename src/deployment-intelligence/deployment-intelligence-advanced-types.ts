import {
  DeploymentTarget,
  DeploymentRecommendation
} from "./deployment-intelligence-types";

export interface DeploymentTargetScore {
  target: DeploymentTarget;
  costScore: number;
  complexityScore: number;
  reliabilityScore: number;
  overallScore: number;
}

export interface DeploymentAdvancedAnalysis {
  confidenceScore: number;
  bestTarget: DeploymentTarget;
  cheapestTarget: DeploymentTarget;
  simplestTarget: DeploymentTarget;
  mostReliableTarget: DeploymentTarget;
  targets: DeploymentTargetScore[];
  estimatedMonthlyCost: {
    min: number;
    max: number;
    currency: "USD";
  };
}

export interface DeploymentAdvancedResult {
  recommendation: DeploymentRecommendation;
  analysis: DeploymentAdvancedAnalysis;
}
