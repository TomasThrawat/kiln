import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Next.js MCP route uses Kiln's registry and private persistent Blob storage", async () => {
  const route = await readFile(new URL("../app/api/mcp/route.ts", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(route, /createMcpHandler/);
  assert.match(route, /kilnMcpToolDefs/);
  assert.match(route, /access: "private"/);
  assert.match(route, /KILN_MCP_API_KEY/);
  assert.match(route, /status: 503/);
  assert.ok(config.functions["app/api/mcp/route.ts"]);
});

test("CircleCI validates adapter types, tests, and production build", async () => {
  const config = await readFile(new URL("../../.circleci/config.yml", import.meta.url), "utf8");
  assert.match(config, /npm run typecheck/);
  assert.match(config, /npm test/);
  assert.match(config, /npm run build/);
  assert.doesNotMatch(config, /github\/workflows/);
});
