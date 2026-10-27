# Kiln Remote MCP for Vercel

This subproject exposes Kiln's shared tool definitions over Streamable HTTP at `/api/mcp` without modifying the original engine.

- The MCP tool registry comes from `kilnMcpToolDefs` in the published Kiln package.
- Immutable source snapshots and asset revisions are kept in **private Vercel Blob storage**.
- Source refs, saved asset file hashes, and GLB structure are verified when loaded.
- `/api/health` checks storage and authentication configuration.
- `KILN_MCP_API_KEY` is required: requests return 503 until configured and 401 for invalid credentials.

Set the Vercel project root directory to `vercel-mcp`, use Node.js 22, connect a private Blob store, and set `KILN_MCP_API_KEY` in Vercel's secret variable UI. Connect with `Authorization: Bearer <key>`.

This hosted adapter includes Kiln's shared authoring/render/inspect/edit/source and saved-asset tool definitions. Host-specific project storage, material-library management, local export-root operations and Live Review are not fully wired into the hosted adapter.

The root `.circleci/config.yml` runs TypeScript validation, contract tests, and a Next.js production build. CircleCI must have the GitHub App repository connection enabled for automatic runs.
