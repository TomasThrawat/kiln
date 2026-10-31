# Kiln Remote MCP for Vercel

This subproject exposes Kiln's shared tool definitions over public Streamable HTTP at `/api/mcp`.

- The MCP tool registry comes from `kilnMcpToolDefs` in the published Kiln package.
- **All registered MCP tools and resources are unauthenticated.** No API key or `Authorization` header is required.
- Immutable source snapshots and asset revisions are stored in private Vercel Blob storage.
- Source refs, saved asset file hashes, and GLB structure are verified when loaded.
- `/api/health` reports storage configuration and confirms that MCP authentication is not required.

## Public access warning

Anyone who knows or discovers the endpoint URL can call every registered Kiln MCP tool. This includes authoring, rendering, inspection, editing, source-program, and saved-asset operations exposed by the published tool registry. Those tools can read or change data in the shared private Blob store through this server.

Do not store secrets, credentials, or content that must remain private in this Kiln instance. Public callers may consume compute, Blob operations, and data transfer associated with the Vercel project. The endpoint URL is not an access-control mechanism.

Set the Vercel project root directory to `vercel-mcp`, use Node.js 22, and connect the private Blob store. No `KILN_MCP_API_KEY` variable is needed. Connect an MCP client directly to `https://<your-deployment>/api/mcp` without an authorization header.

This hosted adapter includes Kiln's shared authoring/render/inspect/edit/source and saved-asset tool definitions. Host-specific project storage, material-library management, local export-root operations and Live Review are not fully wired into the hosted adapter.

The root `.circleci/config.yml` runs TypeScript validation, contract tests, and a Next.js production build. CircleCI must have the GitHub App repository connection enabled for automatic runs.

## Reusing saved assets in other projects

The adapter exposes the asset resource template `kiln://assets/{collection}/{asset}/{revision}/{file}` through MCP `resources/read`. It reads the private saved revision through Kiln's existing integrity checks, so `asset.glb` is the saved binary rather than a procedural reconstruction. The template also covers the saved source, preview, manifest, editable bundle, and derived runtime GLB/metadata supported by the Kiln engine.

For clients that cannot issue `resources/read`, call `kiln_read_resource` with the exact URI returned by a Kiln save/export result. Binary responses include `mimeType`, `sizeBytes`, `sha256`, and `dataBase64`; text resources include `text`. Decode `dataBase64` without modifying the bytes, verify the reported SHA-256, and add the file to the target project's own asset directory.

- **HTML / Three.js:** place the decoded `.glb` in the web app's served assets directory and load it with `GLTFLoader`.
- **Flutter / Android:** place the decoded `.glb` under the app's assets directory, declare it in `pubspec.yaml`, then rebuild the APK so the asset is packaged.
- **Other builds:** copy the decoded bytes into the target project's normal asset/resource location and use the engine's GLB loader.

This is a transport/export bridge: it makes the exact saved bytes available to compatible clients, but does not silently edit arbitrary repositories or rebuild an APK/HTML project by itself. The client or build workflow still adds the file to its target project and runs that project's build.
