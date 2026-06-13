import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

// Vercel requires the default ".next" output directory.
const env = { ...process.env };
if (!env.VERCEL) {
  env.NEXT_DIST_DIR = ".next-build";
}

const result = spawnSync(process.execPath, [nextBin, "build"], {
  cwd: root,
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);