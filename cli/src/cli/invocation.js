import path from "node:path";

const COMMANDS = [
  "start",
  "doctor",
  "publish",
  "update",
  "sync-project-config",
  "sync-readme",
  "sync-github-workflow",
  "setup-railway",
  "update-railway",
  "sync-railway-env",
  "print-railway-config",
  "export-railway-config",
  "import-railway-config",
  "diff-railway-config",
  "deploy-railway",
  "destroy-railway",
];

export function resolveInvocation(argv) {
  const binName = path.basename(argv[1] || "create-asaje-go-vue");
  const normalizedBinName = binName.replace(/\.js$/, "");
  const rawArgs = argv.slice(2);
  const firstArg = rawArgs[0];

  if (["help", "--help", "-h"].includes(firstArg || "")) {
    return { argv: rawArgs.slice(1), command: "help", title: normalizedBinName };
  }

  if (normalizedBinName === "asaje") {
    if (!firstArg) {
      return { argv: [], command: "help", title: "asaje" };
    }

    if (firstArg === "create") {
      return { argv: rawArgs.slice(1), command: "create", title: "asaje create" };
    }

    if (COMMANDS.includes(firstArg)) {
      return { argv: rawArgs.slice(1), command: firstArg, title: `asaje ${firstArg}` };
    }

    return { argv: [], command: "help", title: "asaje" };
  }

  if (COMMANDS.includes(firstArg)) {
    return { argv: rawArgs.slice(1), command: firstArg, title: "create-asaje-go-vue" };
  }

  return { argv: rawArgs, command: "create", title: "create-asaje-go-vue" };
}
