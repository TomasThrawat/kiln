export const runtime = "nodejs";
export function GET() {
  return Response.json({
    ok: true,
    service: "kiln-vercel-mcp",
    engine: "@instruktlabs/kiln",
    storageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    authenticationConfigured: Boolean(process.env.KILN_MCP_API_KEY),
  });
}
