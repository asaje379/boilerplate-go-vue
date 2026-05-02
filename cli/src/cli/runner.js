export async function runCliCommand(invocation, runners) {
  switch (invocation.command) {
    case "help":
      runners.printHelp();
      return "Ready.";
    case "start":
      await runners.runStart(invocation.argv);
      return "Services stopped.";
    case "doctor":
      await runners.runDoctor(invocation.argv);
      return "Doctor finished.";
    case "publish":
      await runners.runPublish(invocation.argv);
      return "Publish checklist complete.";
    case "update":
      await runners.runUpdate(invocation.argv);
      return "Project update complete.";
    case "sync-project-config":
      await runners.runSyncProjectConfig(invocation.argv);
      return "Project config sync complete.";
    case "sync-readme":
      await runners.runSyncReadme(invocation.argv);
      return "Project README sync complete.";
    case "sync-github-workflow":
      await runners.runSyncGithubWorkflow(invocation.argv);
      return "GitHub workflow sync complete.";
    case "setup-railway":
      await runners.runSetupRailway(invocation.argv);
      return "Railway setup complete.";
    case "update-railway":
      await runners.runUpdateRailway(invocation.argv);
      return "Railway update complete.";
    case "sync-railway-env":
      await runners.runSyncRailwayEnv(invocation.argv);
      return "Railway environment sync complete.";
    case "print-railway-config":
      await runners.runPrintRailwayConfig(invocation.argv);
      return "Railway config printed.";
    case "export-railway-config":
      await runners.runExportRailwayConfig(invocation.argv);
      return "Railway config exported.";
    case "import-railway-config":
      await runners.runImportRailwayConfig(invocation.argv);
      return "Railway config imported.";
    case "diff-railway-config":
      await runners.runDiffRailwayConfig(invocation.argv);
      return "Railway config diff complete.";
    case "deploy-railway":
      await runners.runDeployRailway(invocation.argv);
      return "Railway deployment complete.";
    case "destroy-railway":
      await runners.runDestroyRailway(invocation.argv);
      return "Railway teardown complete.";
    case "create":
    default:
      await runners.runCreate(invocation.argv);
      return "Project ready.";
  }
}
