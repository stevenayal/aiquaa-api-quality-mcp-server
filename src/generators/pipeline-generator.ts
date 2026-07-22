import { analyzeCiWorkflow } from "../analyzers/ci-analyzer.js";
import { DEFAULT_PATHS } from "../constants.js";

export interface PipelineGeneratorOptions {
  apiName: string;
  target: "github_actions" | "azure_pipelines";
  collectionPath: string;
  environmentPath: string;
  nodeVersion: string;
  existingWorkflow?: string;
}

export interface PipelineGenerationResult {
  content: string;
  strategy: "create" | "extend";
  reason: string;
}

export function generatePipeline(options: PipelineGeneratorOptions): PipelineGenerationResult {
  if (options.existingWorkflow) {
    const analysis = analyzeCiWorkflow(options.existingWorkflow);
    if (analysis.hasNewmanJob) {
      return {
        content: options.existingWorkflow,
        strategy: "extend",
        reason:
          "El workflow existente ya contiene un job de Newman; no se modificó para evitar duplicarlo.",
      };
    }
    const merged =
      options.target === "github_actions"
        ? insertGithubActionsJob(options.existingWorkflow, options)
        : insertAzurePipelinesJob(options.existingWorkflow, options);
    return {
      content: merged,
      strategy: "extend",
      reason: "Se insertó el job de Newman preservando los jobs/steps existentes.",
    };
  }

  const content =
    options.target === "github_actions"
      ? buildGithubActionsWorkflow(options)
      : buildAzurePipelinesWorkflow(options);
  return {
    content,
    strategy: "create",
    reason: "No existía workflow previo; se generó uno nuevo.",
  };
}

function buildGithubActionsWorkflow(options: PipelineGeneratorOptions): string {
  return `name: Newman — ${options.apiName}

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  newman:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v6
        with:
          node-version: ${options.nodeVersion}

      - name: Install Newman
        run: npm install -g newman newman-reporter-htmlextra

      - name: Run collection
        run: |
          newman run ${options.collectionPath} \\
            -e ${options.environmentPath} \\
            -r cli,json,junit,htmlextra \\
            --reporter-json-export ${DEFAULT_PATHS.newmanResultsJson} \\
            --reporter-junit-export ${DEFAULT_PATHS.newmanJunitXml} \\
            --reporter-htmlextra-export ${DEFAULT_PATHS.newmanReportHtml} \\
            --bail

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: newman-report-${normalizeName(options.apiName)}
          path: ${DEFAULT_PATHS.resultsDir}/
`;
}

function buildAzurePipelinesWorkflow(options: PipelineGeneratorOptions): string {
  return `trigger:
  branches:
    include: [main, develop]
pool:
  vmImage: ubuntu-latest
steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '${options.nodeVersion}.x'
    displayName: Setup Node

  - script: npm install -g newman newman-reporter-htmlextra
    displayName: Install Newman

  - script: |
      newman run ${options.collectionPath} \\
        -e ${options.environmentPath} \\
        -r cli,json,junit,htmlextra \\
        --reporter-json-export $(Build.ArtifactStagingDirectory)/newman-results.json \\
        --reporter-junit-export $(Build.ArtifactStagingDirectory)/newman-junit.xml \\
        --reporter-htmlextra-export $(Build.ArtifactStagingDirectory)/newman-report.html \\
        --bail
    displayName: Run Newman — ${options.apiName}

  - task: PublishBuildArtifacts@1
    condition: always()
    inputs:
      pathToPublish: $(Build.ArtifactStagingDirectory)
      artifactName: newman-report-${normalizeName(options.apiName)}
    displayName: Upload report
`;
}

function insertGithubActionsJob(existing: string, options: PipelineGeneratorOptions): string {
  const jobBlock = `
  newman:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: ${options.nodeVersion}
      - name: Install Newman
        run: npm install -g newman newman-reporter-htmlextra
      - name: Run collection
        run: |
          newman run ${options.collectionPath} \\
            -e ${options.environmentPath} \\
            -r cli,json,junit,htmlextra \\
            --reporter-json-export ${DEFAULT_PATHS.newmanResultsJson} \\
            --reporter-junit-export ${DEFAULT_PATHS.newmanJunitXml} \\
            --reporter-htmlextra-export ${DEFAULT_PATHS.newmanReportHtml} \\
            --bail
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: newman-report-${normalizeName(options.apiName)}
          path: ${DEFAULT_PATHS.resultsDir}/
`;
  if (/^jobs:\s*$/m.test(existing)) {
    return existing.replace(/^jobs:\s*$/m, `jobs:${jobBlock}`);
  }
  if (/^jobs:/m.test(existing)) {
    return existing.replace(/^jobs:\n/m, `jobs:\n${jobBlock}`);
  }
  return `${existing}\njobs:${jobBlock}`;
}

function insertAzurePipelinesJob(existing: string, options: PipelineGeneratorOptions): string {
  const stepsBlock = `
  - script: npm install -g newman newman-reporter-htmlextra
    displayName: Install Newman (${options.apiName})
  - script: |
      newman run ${options.collectionPath} \\
        -e ${options.environmentPath} \\
        -r cli,json,junit,htmlextra \\
        --reporter-json-export $(Build.ArtifactStagingDirectory)/newman-results.json \\
        --reporter-junit-export $(Build.ArtifactStagingDirectory)/newman-junit.xml \\
        --reporter-htmlextra-export $(Build.ArtifactStagingDirectory)/newman-report.html \\
        --bail
    displayName: Run Newman — ${options.apiName}
  - task: PublishBuildArtifacts@1
    condition: always()
    inputs:
      pathToPublish: $(Build.ArtifactStagingDirectory)
      artifactName: newman-report-${normalizeName(options.apiName)}
    displayName: Upload report (${options.apiName})
`;
  if (/^steps:/m.test(existing)) {
    return existing.replace(/^steps:\n/m, `steps:\n${stepsBlock}`);
  }
  return `${existing}\nsteps:${stepsBlock}`;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");
}
