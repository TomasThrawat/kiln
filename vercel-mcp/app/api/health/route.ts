export const runtime = "nodejs";
export function GET() {
  return Response.json({
    ok: true,
    service: "kiln-vercel-mcp",
    engine: "@instruktlabs/kiln",
    storageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    authenticationRequired: false,
  });
}
