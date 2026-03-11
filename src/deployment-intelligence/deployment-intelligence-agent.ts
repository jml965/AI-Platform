import { DeploymentProjectProfiler } from "./deployment-project-profiler";
import { DeploymentStrategyAgent } from "./deployment-strategy-agent";
import { DeploymentIntelligenceAdvancedAgent } from "./deployment-intelligence-advanced-agent";
import { generateRunbook } from "./deployment-runbook-generator";

export class DeploymentIntelligenceAgent {

  private profiler = new DeploymentProjectProfiler();
  private strategy = new DeploymentStrategyAgent();
  private advanced = new DeploymentIntelligenceAdvancedAgent();

  async analyze(projectPath: string) {

    const profile = await this.profiler.profile(projectPath);

    const recommendation = this.strategy.recommend(profile);

    const analysis = this.advanced.analyze(recommendation);

    generateRunbook(projectPath, recommendation);

    return {
      recommendation,
      analysis
    };

  }

}
