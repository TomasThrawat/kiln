# Kiln Remote MCP for Vercel

This subproject exposes Kiln's shared tool definitions over Streamable HTTP at `/api/mcp` without modifying the original engine.

- The MCP tool registry comes from `kilnMcpToolDefs` in the published Kiln package.
- Immutable source snapshots and asset revisions are kept in **private Vercel Blob storage**.
- Source refs, saved asset file hashes, and GLB structure are verified when loaded.
- `/api/health` checks storage configuration and reports that authentication is not required.
- `/api/mcp` is intentionally public and does not require an API key or bearer token. Blob objects remain private, but public callers can invoke the registered MCP tools, including tools that save assets and source snapshots into this project's Blob storage.

Set the Vercel project root directory to `vercel-mcp`, use Node.js 22, and connect a private Blob store. Connect to `/api/mcp` directly without an `Authorization` header.

This hosted adapter includes Kiln's shared authoring/render/inspect/edit/source and saved-asset tool definitions. Host-specific project storage, material-library management, local export-root operations and Live Review are not fully wired into the hosted adapter.

The root `.circleci/config.yml` runs TypeScript validation, contract tests, and a Next.js production build. CircleCI must have the GitHub App repository connection enabled for automatic runs.
