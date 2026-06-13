import { spawn, execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const nextDir = join(root, ".next");
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT || "3000";

function freePort(targetPort) {
  if (process.platform !== "win32") return;

  try {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, {
      encoding: "utf8",
    });

    const pids = new Set();
    for (const line of output.split("\n")) {
      if (!line.includes("LISTENING")) continue;
      const pid = line.trim().split(/\s+/).at(-1);
      if (pid && pid !== "0") pids.add(pid);
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Freed port ${targetPort} (stopped process ${pid})`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // Port is already free.
  }
}

if (process.argv.includes("--clean") && existsSync(nextDir)) {
  console.log("Cleaning .next dev cache...");
  rmSync(nextDir, { recursive: true, force: true });
}

freePort(port);

console.log(`Starting Next.js dev server on http://localhost:${port}`);
console.log(
  "Tip: run `npm run build` safely while dev is running (uses separate .next-build folder)."
);

const child = spawn(process.execPath, [nextBin, "dev", "-p", port], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NEXT_DIST_DIR: ".next", PORT: port },
});

child.on("exit", (code) => process.exit(code ?? 0));