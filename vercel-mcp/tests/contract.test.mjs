import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Next.js MCP route exposes verified binary asset resources", async () => {
  const route = await readFile(new URL("../app/api/mcp/route.ts", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.ok(route.includes("createMcpHandler"));
  assert.ok(route.includes("createKilnToolHost"));
  assert.ok(route.includes("kilnHost.defs"));
  assert.ok(route.includes('access: "private"'));
  assert.ok(route.includes("KILN_MCP_API_KEY"));
  assert.ok(route.includes('new ResourceTemplate("kiln://assets/{collection}/{asset}/{revision}/{file}"'));
  assert.ok(route.includes("server.registerResource"));
  assert.ok(route.includes("kiln_read_resource"));
  assert.ok(route.includes("dataBase64"));
  assert.ok(route.includes("kilnHost.readResource"));
  assert.ok(route.includes("status: 503"));
  assert.ok(config.functions["app/api/mcp/route.ts"]);
});

test("CircleCI validates adapter types, tests, and production build", async () => {
  const config = await readFile(new URL("../../.circleci/config.yml", import.meta.url), "utf8");
  assert.match(config, /npm run typecheck/);
  assert.match(config, /npm test/);
  assert.match(config, /npm run build/);
  assert.doesNotMatch(config, /github\/workflows/);
});
