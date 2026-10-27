export default function Home() {
  return <main style={{ maxWidth: 760, margin: "64px auto", padding: "0 24px", lineHeight: 1.6 }}>
    <p style={{ color: "#a3a3a3", letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12 }}>Remote MCP service</p>
    <h1 style={{ fontSize: 42, margin: "8px 0 16px" }}>Kiln</h1>
    <p>Procedural 3D asset authoring, inspection, revision and export tools over Streamable HTTP.</p>
    <dl><dt>MCP endpoint</dt><dd><code>/api/mcp</code></dd><dt>Health check</dt><dd><code>/api/health</code></dd></dl>
    <p style={{ color: "#a3a3a3", fontSize: 13 }}>The MCP endpoint requires a configured bearer key. Private Blob storage is not exposed as public files.</p>
  </main>;
}
