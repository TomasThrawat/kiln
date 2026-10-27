export default {
  async fetch(): Promise<Response> {
    return Response.json({
      ok: true,
      service: "kiln-vercel-mcp",
      engine: "@instruktlabs/kiln",
      storageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      authenticationConfigured: Boolean(process.env.KILN_MCP_API_KEY),
    });
  },
};
