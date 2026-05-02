import { confirm, select, text } from "@clack/prompts";
import { prompt } from "../cli/prompts.js";

export async function collectStartAnswers(args) {
  if (args.yes) {
    return {
      directory: args.directory,
      installDependencies: args.installDependencies ?? false,
      profile: args.profile || inferProfileFromArgs(args) || "full",
      selectedServices: buildSelectedServices(args),
      startInfra: args.startInfra ?? true,
    };
  }

  const directory = await prompt(
    text({
      defaultValue: args.directory,
      message: "Project directory to start?",
      placeholder: ".",
      validate(value) {
        return value.trim().length === 0 ? "Project directory is required" : undefined;
      },
    }),
  );

  const installDependencies = await prompt(
    confirm({
      initialValue: args.installDependencies ?? false,
      message: "Install dependencies before start?",
    }),
  );

  const startInfra = await prompt(
    confirm({
      initialValue: args.startInfra ?? true,
      message: "Start local Docker services?",
    }),
  );

  const profile = await prompt(
    select({
      initialValue: inferProfileFromArgs(args) || "full",
      message: "Startup profile?",
      options: [
        { label: "Full stack", value: "full" },
        { label: "Backend only", value: "backend-only" },
        { label: "Frontend only", value: "frontend-only" },
        { label: "Custom", value: "custom" },
      ],
    }),
  );

  if (profile !== "custom") {
    return {
      directory,
      installDependencies,
      profile,
      selectedServices: profileToServices(profile),
      startInfra,
    };
  }

  const api = await prompt(confirm({ initialValue: args.api ?? true, message: "Start API server?" }));
  const worker = await prompt(confirm({ initialValue: args.worker ?? true, message: "Start API worker?" }));
  const realtime = await prompt(confirm({ initialValue: args.realtime ?? true, message: "Start realtime gateway?" }));
  const admin = await prompt(confirm({ initialValue: args.admin ?? true, message: "Start admin frontend?" }));
  const landing = await prompt(confirm({ initialValue: args.landing ?? true, message: "Start landing surface?" }));
  const pwa = await prompt(confirm({ initialValue: args.pwa ?? true, message: "Start PWA surface?" }));

  return {
    directory,
    installDependencies,
    profile: "custom",
    selectedServices: [api && "api", worker && "worker", realtime && "realtime", admin && "admin", landing && "landing", pwa && "pwa"].filter(Boolean),
    startInfra,
  };
}

export function buildSelectedServices(args) {
  if (args.profile) {
    return applyServiceOverrides(profileToServices(args.profile), args);
  }

  return applyServiceOverrides(profileToServices("full"), args);
}

export function inferProfileFromArgs(args) {
  const selected = [
    args.api !== false && "api",
    args.worker !== false && "worker",
    args.realtime !== false && "realtime",
    args.admin !== false && "admin",
    args.landing !== false && "landing",
    args.pwa !== false && "pwa",
  ].filter(Boolean);

  if (selected.length === 6) {
    return "full";
  }

  if (arraysEqual(selected, profileToServices("backend-only"))) {
    return "backend-only";
  }

  if (arraysEqual(selected, profileToServices("frontend-only"))) {
    return "frontend-only";
  }

  return undefined;
}

export function profileToServices(profile) {
  switch (profile) {
    case "backend-only":
      return ["api", "worker", "realtime"];
    case "frontend-only":
      return ["admin", "landing", "pwa"];
    case "custom":
      return [];
    case "full":
    default:
      return ["api", "worker", "realtime", "admin", "landing", "pwa"];
  }
}

function applyServiceOverrides(services, args) {
  return services.filter((service) => args[service] !== false);
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
