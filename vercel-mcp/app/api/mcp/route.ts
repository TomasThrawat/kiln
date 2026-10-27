import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { get, list, put } from "@vercel/blob";
import {
  ASSET_MATERIAL_FILE, assetIdSchema, assetManifestSchema, encodeAssetBundle,
  validateRecordShape, type AssetDraft, type AssetLibrary, type AssetManifest, type AssetRecord,
} from "@instruktlabs/kiln/assets";
import { kilnMcpToolDefs } from "@instruktlabs/kiln/mcp";
import { assertProgramRef, MAX_PROGRAM_BYTES, programNotFound, programReference, type ProgramStore } from "@instruktlabs/kiln/programs";
import { createMcpHandler } from "mcp-handler";

export const runtime = "nodejs";
export const maxDuration = 60;
const ROOT = "kiln";
const MAX_MANIFEST_BYTES = 1024 * 1024;
const ALLOWED_FILES = new Set(["asset.glb", "source.kiln.js", "preview.png"]);
const ALLOWED_COLLECTIONS = new Set(["project", "library"]);
const digest = (bytes: Uint8Array) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function collectionId(value: string) {
  const id = assetIdSchema.parse(value);
  if (!ALLOWED_COLLECTIONS.has(id)) throw new Error("Unknown collection.");
  return id;
}
async function readBytes(pathname: string): Promise<Uint8Array | undefined> {
  const result = await get(pathname, { access: "private" });
  if (!result) return undefined;
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}
async function readText(pathname: string) {
  const bytes = await readBytes(pathname);
  return bytes ? new TextDecoder("utf-8", { fatal: true }).decode(bytes) : undefined;
}
async function writeBlob(pathname: string, body: string | Uint8Array) {
  await put(pathname, typeof body === "string" ? body : Buffer.from(body), {
    access: "private", addRandomSuffix: false, allowOverwrite: true,
  });
}

class BlobProgramStore implements ProgramStore {
  readonly retention = "Persisted in private Vercel Blob storage; immutable references are not evicted.";
  async put(code: string) {
    if (new TextEncoder().encode(code).byteLength > MAX_PROGRAM_BYTES) throw new Error("Program exceeds the 1 MiB source limit.");
    const ref = await programReference(code);
    await writeBlob(`${ROOT}/programs/${ref.slice(7)}.js`, code);
    return ref;
  }
  async get(ref: string) {
    assertProgramRef(ref);
    if (!ref.startsWith("sha256:")) throw programNotFound(ref, "This remote store uses canonical SHA-256 references.");
    const bytes = await readBytes(`${ROOT}/programs/${ref.slice(7)}.js`);
    if (!bytes) throw programNotFound(ref, "This private Blob program store has no such reference.");
    const code = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (await programReference(code) !== ref) throw new Error("Stored program integrity check failed.");
    return code;
  }
}

class BlobAssetLibrary implements AssetLibrary {
  collections() {
    return [{ id: "project", label: "Persistent Kiln project assets" }, { id: "library", label: "Persistent Kiln library assets" }];
  }
  private base(collection: string, assetId: string, revisionId: string) {
    return `${ROOT}/assets/${collectionId(collection)}/${assetIdSchema.parse(assetId)}/revisions/${assetIdSchema.parse(revisionId)}`;
  }
  private manifestPath(collection: string, assetId: string, revisionId: string) {
    return `${this.base(collection, assetId, revisionId)}/manifest.json`;
  }
  async list(collection: string): Promise<AssetManifest[]> {
    const prefix = `${ROOT}/assets/${collectionId(collection)}/`;
    const paths: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
      for (const blob of page.blobs) if (blob.pathname.endsWith("/manifest.json")) paths.push(blob.pathname);
      cursor = page.cursor || undefined;
    } while (cursor);
    const records: AssetManifest[] = [];
    for (const pathname of paths) {
      const raw = await readText(pathname);
      if (!raw) continue;
      if (new TextEncoder().encode(raw).byteLength > MAX_MANIFEST_BYTES) throw new Error("Saved asset manifest exceeds 1 MiB.");
      const manifest = assetManifestSchema.parse(JSON.parse(raw));
      const bits = pathname.slice(prefix.length).split("/");
      if (bits[0] !== manifest.assetId || bits[2] !== manifest.revisionId) throw new Error("Asset manifest path/identity mismatch.");
      records.push(manifest);
    }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.revisionId.localeCompare(b.revisionId));
  }
  async read(collection: string, assetId: string, revisionId: string): Promise<AssetRecord> {
    const raw = await readText(this.manifestPath(collection, assetId, revisionId));
    if (!raw || new TextEncoder().encode(raw).byteLength > MAX_MANIFEST_BYTES) throw new Error("Saved Kiln asset manifest not found or too large.");
    const original = JSON.parse(raw);
    assetManifestSchema.parse(original);
    const manifest = original as AssetManifest;
    if (manifest.assetId !== assetId || manifest.revisionId !== revisionId) throw new Error("Asset identity mismatch.");
    const files: Record<string, Uint8Array> = {};
    for (const name of Object.keys(manifest.files)) {
      if (!ALLOWED_FILES.has(name)) throw new Error("Invalid saved asset filename.");
      const bytes = await readBytes(`${this.base(collection, assetId, revisionId)}/${name}`);
      if (!bytes) throw new Error(`Saved asset file missing: ${name}`);
      const expected = manifest.files[name];
      if (bytes.length !== expected?.bytes || digest(bytes) !== expected?.sha256) throw new Error(`Saved asset integrity failure: ${name}`);
      files[name] = bytes;
    }
    const record: AssetRecord = { manifest, files };
    const materialText = await readText(`${this.base(collection, assetId, revisionId)}/${ASSET_MATERIAL_FILE}`);
    if (materialText !== undefined) {
      if (new TextEncoder().encode(materialText).byteLength > 24 * 1024 * 1024) throw new Error("Material resources exceed 24 MiB.");
      record.materialResources = JSON.parse(materialText);
    }
    validateRecordShape(record);
    return record;
  }
  async save(collection: string, draft: AssetDraft): Promise<AssetManifest> {
    const selected = collectionId(collection);
    const assetId = draft.assetId ?? `a_${randomUUID().replaceAll("-", "")}`;
    if (draft.parentRevision) await this.read(selected, assetId, draft.parentRevision);
    else if (draft.assetId && (await this.list(selected)).some(m => m.assetId === assetId)) throw new Error("An existing asset requires parentRevision.");
    const files: Record<string, Uint8Array> = { "asset.glb": Uint8Array.from(draft.glb) };
    if (draft.code !== undefined) files["source.kiln.js"] = new TextEncoder().encode(draft.code);
    if (draft.preview) files["preview.png"] = Uint8Array.from(draft.preview);
    const manifest = assetManifestSchema.parse({
      version: "kiln.asset.v1", assetId, revisionId: `r_${randomUUID().replaceAll("-", "")}`,
      parentRevision: draft.parentRevision, name: draft.name, tags: draft.tags ?? [],
      createdAt: new Date().toISOString(), description: draft.description, brief: draft.brief,
      attribution: draft.attribution, editable: draft.code !== undefined,
      files: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, { sha256: digest(bytes), bytes: bytes.length }])),
      build: draft.build ? { ...draft.build, rebuild: draft.build.rebuild ?? "engine-required" } : undefined,
      preview: draft.previewInfo,
    });
    await this.import(selected, [{ manifest, files }]);
    return manifest;
  }
  async import(collection: string, records: AssetRecord[]): Promise<AssetManifest[]> {
    const selected = collectionId(collection);
    if (!records.length || records.length > 100) throw new Error("Import requires 1..100 revisions.");
    for (const record of records) {
      validateRecordShape(record);
      for (const [name, bytes] of Object.entries(record.files)) {
        if (!ALLOWED_FILES.has(name) || record.manifest.files[name]?.sha256 !== digest(bytes)) throw new Error(`Asset file hash mismatch: ${name}`);
      }
      const path = this.manifestPath(selected, record.manifest.assetId, record.manifest.revisionId);
      const priorRaw = await readText(path);
      if (priorRaw !== undefined) {
        const prior = await this.read(selected, record.manifest.assetId, record.manifest.revisionId);
        if (JSON.stringify(prior.manifest) !== JSON.stringify(record.manifest)) throw new Error("Saved asset revisions are immutable.");
        for (const [name, bytes] of Object.entries(record.files)) if (digest(prior.files[name] ?? new Uint8Array()) !== digest(bytes)) throw new Error("Saved asset revision conflicts with existing content.");
        continue;
      }
      const base = this.base(selected, record.manifest.assetId, record.manifest.revisionId);
      for (const [name, bytes] of Object.entries(record.files)) await writeBlob(`${base}/${name}`, bytes);
      if (record.materialResources) {
        const payload = JSON.stringify(record.materialResources);
        if (new TextEncoder().encode(payload).length > 24 * 1024 * 1024) throw new Error("Material payload exceeds 24 MiB.");
        await writeBlob(`${base}/${ASSET_MATERIAL_FILE}`, payload);
      }
      await writeBlob(path, JSON.stringify(record.manifest, null, 2));
    }
    return records.map(r => r.manifest);
  }
  async exportBundle(records: AssetRecord[]): Promise<Uint8Array> {
    if (!records.length || records.length > 100) throw new Error("Bundle requires 1..100 revisions.");
    for (const record of records) validateRecordShape(record);
    return encodeAssetBundle(records);
  }
}

const programStore = new BlobProgramStore();
const assetLibrary = new BlobAssetLibrary();
const definitions = kilnMcpToolDefs({ programStore, assetLibrary });
const handler = createMcpHandler((server) => {
  for (const definition of definitions) {
    server.registerTool(definition.name, { description: definition.description, inputSchema: definition.inputSchema }, async (input) => {
      try {
        const result = await definition.run(input);
        const multi = definition.mediaMulti?.(result);
        const single = multi ? undefined : definition.media?.(result);
        const json = multi?.json ?? single?.json ?? result;
        const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: "image/png" }> = [
          { type: "text", text: definition.text?.(result) ?? JSON.stringify(json) ?? String(json) },
        ];
        for (const png of multi?.pngs ?? (single ? [single.png] : [])) content.push({ type: "image", data: Buffer.from(png).toString("base64"), mimeType: "image/png" });
        return { content, isError: Boolean(result && typeof result === "object" && (result as { ok?: unknown }).ok === false) };
      } catch (error) {
        return { content: [{ type: "text", text: error instanceof Error ? error.message : "Kiln tool failed." }], isError: true };
      }
    });
  }
}, { serverInfo: { name: "kiln-vercel-mcp", version: "1.0.0" } });

function authorize(request: Request): Response | undefined {
  const expected = process.env.KILN_MCP_API_KEY;
  if (!expected) return Response.json({ error: "MCP endpoint not configured. Set KILN_MCP_API_KEY." }, { status: 503 });
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  if (a.length === b.length && timingSafeEqual(a, b)) return undefined;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
async function dispatch(request: Request): Promise<Response> {
  const denied = authorize(request);
  return denied ?? handler(request);
}
export { dispatch as GET, dispatch as POST };
