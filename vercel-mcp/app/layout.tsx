import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Kiln Remote MCP",
  description: "Remote MCP endpoint for the Kiln procedural 3D asset engine.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body style={{ margin: 0, minHeight: "100vh", background: "#090909", color: "#f5f5f5", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>{children}</body></html>;
}
