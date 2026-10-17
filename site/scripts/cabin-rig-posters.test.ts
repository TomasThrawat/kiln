import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as posters from './rig-posters.mjs';
import { hashBytes } from './mirror-core.mjs';
import { rigPosterKey } from './rig-posters-core.mjs';

const id = 'cabin-woods-psx-horror';
const data = new URL('../src/data/', import.meta.url);
const json = async (file: string) => JSON.parse(await readFile(new URL(file, data), 'utf8'));

test('all 53 Cabin gallery posters are single views of their delivered revision, pinned and planned', async () => {
  const [catalog, recorded, manifest, plan] = await Promise.all([
    json(`${id}.json`), json('rig-posters.json'), json('mirror-manifest.json'), json('commons-build.json'),
  ]);
  expect(catalog.assets).toHaveLength(53);
  for (const asset of catalog.assets) {
    const record = recorded.posters[rigPosterKey(id, asset.slug)];
    expect(record, asset.slug).toBeDefined();
    expect(record.revisionId).toBe(asset.revisionId);
    expect(record.assetId).toBe(asset.assetId);
    expect(record.glb.sha256).toBe(asset.runtimeModelDownload.sha256);
    expect(record.glb.bytes).toBe(asset.runtimeModelDownload.bytes);
    expect([record.width, record.height]).toEqual([1024, 1024]);
    expect(asset.poster.inputPath).toBe(record.path);
    expect(asset.poster.sourceRevisionId).toBe(asset.revisionId);
    expect(asset.poster.alt).not.toContain('saved revision preview');
    expect(asset.poster).not.toHaveProperty('fidelity');
    expect(manifest.files.find((pin: { path: string }) => pin.path === record.path)).toEqual({ path: record.path, bytes: record.bytes, sha256: record.sha256 });
    expect(plan.images.some((image: { inputPath: string }) => image.inputPath === record.path)).toBe(true);
  }
});

test('Cabin poster targets use hash-verified staged runtime models, never the review sheet or archive', async () => {
  const root = await mkdtemp(join(tmpdir(), 'kiln-cabin-posters-'));
  try {
    const glb = Buffer.from('delivered cabin model');
    const download = { path: 'models/rock.glb', url: `/asset-demos/${id}/models/rock.glb`, bytes: glb.length, sha256: hashBytes(glb) };
    await mkdir(join(root, 'data'), { recursive: true });
    await mkdir(join(root, 'public', `asset-demos/${id}/models`), { recursive: true });
    await writeFile(join(root, 'data', `${id}.json`), JSON.stringify({ release: 'r1', assets: [{ slug: 'rock', name: 'Rock', assetId: 'a_rock', revisionId: 'r_rock', description: 'A rock.', runtimeModelDownload: download }] }));
    const file = join(root, 'public', download.url);
    await writeFile(file, glb);
    const [target] = await posters.cabinWoodsTargets({ publicDir: join(root, 'public'), data: join(root, 'data') });
    expect(target).toMatchObject({ pack: id, release: 'r1', slug: 'rock', revisionId: 'r_rock', assetId: 'a_rock', glbPath: download.url, view: posters.CABIN_WOODS_POSTER });
    expect(target.glb.equals(glb)).toBe(true);
    await writeFile(file, Buffer.from('wrong model'));
    await expect(posters.cabinWoodsTargets({ publicDir: join(root, 'public'), data: join(root, 'data') })).rejects.toThrow('SHA-256/size verification failed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
