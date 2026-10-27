import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Vercel MCP route and private Blob storage are configured", async () => {
  const route = await readFile(new URL("../api/mcp.ts", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(route, /createMcpHandler/);
  assert.match(route, /kilnMcpToolDefs/);
  assert.match(route, /access: "private"/);
  assert.match(route, /KILN_MCP_API_KEY/);
  assert.ok(config.functions["api/mcp.ts"]);
});

test("CircleCI checks the Vercel adapter before any deployment automation", async () => {
  const config = await readFile(new URL("../../.circleci/config.yml", import.meta.url), "utf8");
  assert.match(config, /npm run typecheck/);
  assert.match(config, /npm test/);
  assert.doesNotMatch(config, /github\/workflows/);
});
