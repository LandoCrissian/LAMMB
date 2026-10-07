import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from './canonical.ts';
import { assetManifestSchema } from './engine-schema.ts';
import { relativePathSchema } from './schema.ts';
import type { EngineArtifacts } from './engine.ts';

export const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
export const GENERATED_ROOT = join(REPOSITORY_ROOT, 'artifacts/generated');
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_ASSET_BYTES = 1024 * 1024;

function within(root: string, target: string) {
  const difference = relative(root, target);
  return (
    difference === '' ||
    (!isAbsolute(difference) &&
      difference !== '..' &&
      !difference.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`))
  );
}

async function noLinks(root: string, target: string, allowMissing = false) {
  if (!within(root, target)) throw new Error('Path outside approved root');
  const segments = relative(root, target).split(/[\\/]/).filter(Boolean);
  let current = root;
  for (const segment of ['', ...segments]) {
    current = segment ? join(current, segment) : current;
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink())
        throw new Error('Symbolic links/junctions are forbidden');
      if (!within(await realpath(root), await realpath(current)))
        throw new Error('Resolved path outside approved root');
    } catch (error) {
      if (allowMissing && (error as NodeJS.ErrnoException).code === 'ENOENT')
        continue;
      throw error;
    }
  }
}

export async function readJson(
  path: string,
  byteLimit = MAX_JSON_BYTES,
): Promise<unknown> {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > byteLimit)
    throw new Error('Input JSON must be a bounded regular file');
  const content = await readFile(path);
  if (content.length > byteLimit)
    throw new Error('Input JSON exceeded byte limit');
  return JSON.parse(content.toString('utf8')) as unknown;
}

export async function readAssetBytes(
  assetRoot: string,
  manifestInput: unknown,
): Promise<Map<string, Uint8Array>> {
  const root = resolve(assetRoot);
  const allowedRoots = [
    join(REPOSITORY_ROOT, 'packages/art-generator/assets'),
    join(REPOSITORY_ROOT, 'packages/art-generator/fixtures/assets'),
  ];
  if (!allowedRoots.some((allowed) => root === allowed))
    throw new Error('Source asset root is not approved');
  await noLinks(REPOSITORY_ROOT, root);
  const manifest = assetManifestSchema.parse(manifestInput);
  const result = new Map<string, Uint8Array>();
  let totalBytes = 0;
  for (const asset of manifest.assets) {
    const path = resolve(root, relativePathSchema.parse(asset.path));
    await noLinks(root, path);
    const info = await lstat(path);
    if (!info.isFile() || info.size > MAX_ASSET_BYTES)
      throw new Error('Source asset must be a small regular file');
    const bytes = await readFile(path);
    totalBytes += bytes.length;
    if (bytes.length > MAX_ASSET_BYTES || totalBytes > 64 * MAX_ASSET_BYTES)
      throw new Error('Source asset byte budget exceeded');
    result.set(asset.id, bytes);
  }
  return result;
}

const artifactFiles = {
  logicalCollection: 'collection.json',
  publicMetadata: 'metadata.json',
  provenance: 'provenance.json',
  summary: 'summary.json',
} as const;

async function generatedPath(relativeDirectory: string, createRoot: boolean) {
  relativePathSchema.parse(relativeDirectory);
  await noLinks(REPOSITORY_ROOT, GENERATED_ROOT, true);
  if (createRoot) await mkdir(GENERATED_ROOT, { recursive: true });
  const directory = resolve(GENERATED_ROOT, relativeDirectory);
  await noLinks(GENERATED_ROOT, directory, createRoot);
  return directory;
}

export async function writeArtifacts(
  relativeDirectory: string,
  artifacts: EngineArtifacts,
): Promise<string> {
  const destination = await generatedPath(relativeDirectory, true);
  try {
    await lstat(destination);
    throw new Error('Output directory already exists; choose a new directory');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const parent = dirname(destination);
  await noLinks(GENERATED_ROOT, parent, true);
  await mkdir(parent, { recursive: true });
  // Fixed staging suffix, exclusive creation, constant filenames, no overwrite.
  const staging = `${destination}-staging`;
  await mkdir(staging);
  for (const [key, filename] of Object.entries(artifactFiles)) {
    await noLinks(GENERATED_ROOT, staging);
    const file = await open(join(staging, filename), 'wx');
    try {
      await file.writeFile(
        canonicalJson(artifacts[key as keyof EngineArtifacts]),
        'utf8',
      );
    } finally {
      await file.close();
    }
  }
  await noLinks(GENERATED_ROOT, destination, true);
  await rename(staging, destination);
  return destination;
}

export async function readArtifacts(
  relativeDirectory: string,
): Promise<unknown> {
  const directory = await generatedPath(relativeDirectory, false);
  const result: Record<string, unknown> = {};
  for (const [key, filename] of Object.entries(artifactFiles)) {
    const path = join(directory, filename);
    await noLinks(GENERATED_ROOT, path);
    result[key] = await readJson(path, 64 * 1024 * 1024);
  }
  return result;
}
