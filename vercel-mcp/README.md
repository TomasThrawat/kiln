# Kiln Remote MCP for Vercel

This subproject exposes the published Kiln 1.5.0 tool registry over Streamable HTTP at `/api/mcp`. It leaves the upstream Kiln engine and the rest of this fork intact.

## Capabilities

- Uses Kiln's shared MCP tool definitions rather than reimplementing tool schemas.
- Stores immutable program source and saved asset revisions in **Vercel private Blob storage**.
- Preserves source/GLB/preview bytes and validates file hashes and GLB structure when assets are read or imported.
- Provides `/api/health` for a small deployment/storage configuration check.
- Supports an optional bearer key through `KILN_MCP_API_KEY`. When it is unset, the MCP endpoint is public; only leave it unset if public write/render tools are intentional.

The engine's optional project, material-library, and Live Review host adapters are not wired in this deployment; the standard geometry/render/edit/inspect/source and saved-asset tools are the intended initial surface.

## Vercel

Set the Vercel project Root Directory to `vercel-mcp` and use Node.js 22. Create a **private** Blob store connected to that project; Vercel supplies `BLOB_READ_WRITE_TOKEN` automatically. Do not make this store public: it holds user-authored source and asset data.

- Health: `/api/health`
- MCP: `/api/mcp`

To require authentication, add `KILN_MCP_API_KEY` in the Vercel project's Production and Preview environments and send `Authorization: Bearer <key>`. Store keys only in the platform's secret-variable UI.

## CircleCI

The repository-level `.circleci/config.yml` runs the adapter's TypeScript checks and contract tests. Git integration may also create Vercel deployments on pushes; the CircleCI job is the CI gate, but this configuration does not itself promote a tested Vercel deployment.
