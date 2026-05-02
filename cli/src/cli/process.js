import { execa } from "execa";

export async function runCommand(command, args, cwd, options = {}) {
  const execaImpl = options.execaImpl || execa;
  await execaImpl(command, args, {
    cwd,
    stdio: "inherit",
  });
}

export async function checkCommand(spec, options = {}) {
  const execaImpl = options.execaImpl || execa;
  try {
    const result = await execaImpl(spec.command, spec.args, {
      reject: false,
    });

    if (result.exitCode !== 0) {
      return { message: `${spec.name} unavailable`, ok: false };
    }

    const version = (result.stdout || result.stderr || "").split(/\r?\n/)[0].trim();
    return { message: `${spec.name} detected${version ? ` (${version})` : ""}`, ok: true };
  } catch {
    return { message: `${spec.name} unavailable`, ok: false };
  }
}

export function createManagedProcess(spec, options = {}) {
  const execaImpl = options.execaImpl || execa;
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const child = execaImpl(spec.command, spec.args, {
    cwd: spec.cwd,
    stderr: "pipe",
    stdout: "pipe",
  });

  const prefix = spec.color(`[${spec.name}] `);
  child.stdout?.on("data", (chunk) => {
    stdout.write(prefixChunk(prefix, chunk));
  });
  child.stderr?.on("data", (chunk) => {
    stderr.write(prefixChunk(prefix, chunk));
  });

  const managed = child.then((result) => ({ ...result, name: spec.name }));
  managed.kill = (...args) => child.kill(...args);
  return managed;
}

export function prefixChunk(prefix, chunk) {
  const textValue = chunk.toString();
  const normalized = textValue.replace(/\n/g, `\n${prefix}`);
  return `${prefix}${normalized}`;
}
