// Regenerates the Mermaid graph embedded in docs/app-architecture.md from
// Nx's real project graph (ADR-00006/ADR-00016) — apps/packages and their
// dependency edges, not hand-drawn, so it can't silently drift from what
// `nx graph` itself would show. Only the TypeScript side: services/* has
// no Nx project (ADR-00019), so it's covered by docs/system-architecture.md
// instead, not here.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = new URL("..", import.meta.url).pathname;
const docPath = join(repoRoot, "docs/app-architecture.md");

const tmpDir = mkdtempSync(join(tmpdir(), "nx-graph-"));
const graphJsonPath = join(tmpDir, "graph.json");
try {
  // Resolved via PATH deliberately, not an absolute path — this is a local
  // dev-tooling script (not processing untrusted input), and the same
  // "pnpm"/"nx" resolution every other script/CI job in this repo already
  // relies on; hardcoding an absolute path would just make it non-portable.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  execFileSync("pnpm", ["exec", "nx", "graph", `--file=${graphJsonPath}`], {
    cwd: repoRoot,
    stdio: "ignore",
  });

  const { graph } = JSON.parse(readFileSync(graphJsonPath, "utf8"));

  const lines = ["```mermaid", "graph TD"];
  for (const [name, node] of Object.entries(graph.nodes)) {
    const label = `${name} (${node.type})`;
    const shape = node.type === "app" ? `["${label}"]` : `(["${label}"])`;
    lines.push(`  ${name}${shape}`);
  }
  lines.push("");
  for (const [source, deps] of Object.entries(graph.dependencies)) {
    for (const dep of deps) {
      const arrow = dep.type === "static" ? "-->" : "-.->";
      const label = dep.type === "static" ? "" : `|${dep.type}|`;
      lines.push(`  ${source} ${arrow}${label} ${dep.target}`);
    }
  }
  lines.push("```");
  const mermaid = lines.join("\n");

  const start = "<!-- nx-graph:start -->";
  const end = "<!-- nx-graph:end -->";
  const content = readFileSync(docPath, "utf8");
  const startIdx = content.indexOf(start);
  const endIdx = content.indexOf(end);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`${docPath} is missing ${start}/${end} markers`);
  }
  const before = content.slice(0, startIdx + start.length);
  const after = content.slice(endIdx);
  writeFileSync(docPath, `${before}\n\n${mermaid}\n\n${after}`);

  console.log(
    "docs/app-architecture.md regenerated from the current Nx project graph.",
  );
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
