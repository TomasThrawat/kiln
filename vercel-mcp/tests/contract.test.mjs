import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Next.js MCP route is public while Blob objects remain private", async () => {
  const route = await readFile(new URL("../app/api/mcp/route.ts", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(route, /createMcpHandler/);
  assert.match(route, /kilnMcpToolDefs/);
  assert.match(route, /access: "private"/);
  assert.doesNotMatch(route, /KILN_MCP_API_KEY|timingSafeEqual|Unauthorized|status: 503/);
  assert.match(route, /return handler\(request\)/);
  const health = await readFile(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
  assert.match(health, /authenticationRequired: false/);
  assert.ok(config.functions["app/api/mcp/route.ts"]);
});

test("CircleCI validates adapter types, tests, and production build", async () => {
  const config = await readFile(new URL("../../.circleci/config.yml", import.meta.url), "utf8");
  assert.match(config, /npm run typecheck/);
  assert.match(config, /npm test/);
  assert.match(config, /npm run build/);
  assert.doesNotMatch(config, /github\/workflows/);
});
