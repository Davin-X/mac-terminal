import { rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const generatedPaths = ["dist", "src-tauri/target"];

for (const relativePath of generatedPaths) {
  const targetPath = resolve(repoRoot, relativePath);
  if (!targetPath.startsWith(`${repoRoot}${sep}`)) {
    throw new Error(`Refusing to clean path outside the repository: ${relativePath}`);
  }
  await rm(targetPath, { recursive: true, force: true });
}

console.log("Removed generated frontend and Rust build outputs.");
