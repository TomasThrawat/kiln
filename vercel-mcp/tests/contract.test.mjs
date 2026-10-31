import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Next.js MCP route exposes all registered tools and verified asset resources without authentication", async () => {
  const route = await readFile(new URL("../app/api/mcp/route.ts", import.meta.url), "utf8");
  const health = await readFile(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.ok(route.includes("createMcpHandler"));
  assert.ok(route.includes("createKilnToolHost"));
  assert.ok(route.includes("kilnHost.defs"));
  assert.ok(route.includes('access: "private"'));
  assert.ok(route.includes("result.statusCode !== 200"));
  assert.ok(route.includes("if (!result || result.statusCode !== 200 || !result.stream)"));
  assert.ok(route.includes("list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) })"));
  assert.ok(route.includes('new ResourceTemplate("kiln://assets/{collection}/{asset}/{revision}/{file}"'));
  assert.ok(route.includes("server.registerResource"));
  assert.ok(route.includes("kiln_read_resource"));
  assert.ok(route.includes("dataBase64"));
  assert.ok(route.includes("kilnHost.readResource"));
  assert.ok(route.includes("return handler(request)"));
  assert.doesNotMatch(route, /KILN_MCP_API_KEY|timingSafeEqual|function authorize|status: 401|status: 503/);
  assert.ok(health.includes("authenticationRequired: false"));
  assert.doesNotMatch(health, /KILN_MCP_API_KEY|authenticationConfigured/);
  assert.ok(config.functions["app/api/mcp/route.ts"]);
});

test("Node engine range stays below an automatic major-version upgrade", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.engines.node, ">=22.2.0 <25");
});

test("CircleCI validates adapter types, tests, and production build", async () => {
  const config = await readFile(new URL("../../.circleci/config.yml", import.meta.url), "utf8");
  assert.match(config, /npm run typecheck/);
  assert.match(config, /npm test/);
  assert.match(config, /npm run build/);
  assert.doesNotMatch(config, /github\/workflows/);
});
