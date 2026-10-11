import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  realpath,
  lstat,
} from 'node:fs/promises';
import { join, resolve, relative, isAbsolute, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { canonicalSha256 } from '../src/canonical.ts';
import {
  productionPilotSchema,
  renderPilotCandidate,
} from '../src/production-pilot.ts';
import { configurePngProofWorker } from '../src/png-proof.ts';
import { readProofEvidence, requireProof } from '../src/png-ingestion.ts';

// Explicit local operator tool. No network, inference, collection assignment or
// production promotion. Outputs are exclusive-created in a new report directory.
export async function runProductionPilot(
  rootInput: string,
  outputInput: string,
  manifestPath: string,
  specPath: string,
  registryPath: string,
) {
  const root = resolve(rootInput),
    output = resolve(outputInput);
  const confined = relative(root, output);
  requireProof(
    confined &&
      !confined.startsWith('..') &&
      !isAbsolute(confined) &&
      confined.replaceAll('\\', '/').startsWith('reports/'),
    'PILOT_OUTPUT_PATH',
  );
  const preflights: { workload: string; availableMiB: number }[] = [];
  function preflight(workload: string) {
    requireProof(
      process.platform === 'win32',
      'PILOT_REQUIRES_LEGION_RAM_PREFLIGHT',
    );
    const availableMiB = Number(
      execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          '(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024',
        ],
        { encoding: 'utf8', windowsHide: true },
      ).trim(),
    );
    console.log(`AVAILABLE_RAM_MIB: ${availableMiB} (${workload})`);
    requireProof(
      Number.isFinite(availableMiB) && availableMiB >= 2048,
      'STOP_FOR_OWNER_REVIEW_RAM',
    );
    preflights.push({ workload, availableMiB });
  }
  preflight('inventory');
  const realRoot = await realpath(root);
  for (const folder of ['output', 'reports', 'references'])
    requireProof(
      !(await lstat(join(root, folder))).isSymbolicLink(),
      'PILOT_LIBRARY_ROOT_LINK',
    );
  const realOutputParent = await realpath(dirname(output));
  const realRelative = relative(realRoot, realOutputParent);
  requireProof(
    !realRelative.startsWith('..') && !isAbsolute(realRelative),
    'PILOT_OUTPUT_LINK',
  );
  configurePngProofWorker();
  const started = performance.now();
  const manifest = productionPilotSchema.parse(
    JSON.parse(await readFile(manifestPath, 'utf8')),
  );
  const spec = JSON.parse(await readFile(specPath, 'utf8'));
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  const inventoryBytes = await readProofEvidence(
    root,
    manifest.approvalInventory,
  );
  type Historical = {
    assetId: string;
    sha256: string;
    aliases: string[];
    principalArtwork: boolean;
    approvalStatus: string;
    knownDefects: string[];
    [key: string]: unknown;
  };
  const old = JSON.parse(inventoryBytes.toString('utf8')) as {
    assets: Historical[];
    counts: unknown;
  };
  const byPath = new Map(
    old.assets.flatMap((a) =>
      a.aliases.map((p) => [resolve(p).toLowerCase(), a] as const),
    ),
  );
  const byHash = new Map(old.assets.map((a) => [a.sha256, a]));
  const seenHistorical = new Set<string>();
  const library = new Map<
    string,
    {
      historical: Historical | null;
      sha256: string;
      bytes: number;
      dimensions: { width: number; height: number; method: string } | null;
      aliases: string[];
      newClassification: string;
    }
  >();
  async function digest(path: string) {
    const hash = createHash('sha256');
    let bytes = 0;
    let header = Buffer.alloc(0);
    for await (const block of createReadStream(path, {
      highWaterMark: 1024 * 1024,
    })) {
      hash.update(block);
      if (!header.length) header = Buffer.from(block).subarray(0, 32);
      bytes += block.length;
    }
    const dimensions =
      header.length >= 24 &&
      header
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      header.toString('ascii', 12, 16) === 'IHDR'
        ? {
            width: header.readUInt32BE(16),
            height: header.readUInt32BE(20),
            method: 'PNG_HEADER_ONLY_NOT_DECODER_VALIDATION',
          }
        : null;
    return { sha256: hash.digest('hex'), bytes, dimensions };
  }
  async function scan(dir: string) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, e.name);
      if (e.isSymbolicLink()) throw new Error('PILOT_LIBRARY_SYMLINK');
      if (
        resolve(path).toLowerCase() === output.toLowerCase() ||
        /TASK_020_STAGE20_PILOT_001/i.test(path)
      )
        continue;
      if (e.isDirectory()) {
        await scan(path);
        continue;
      }
      if (!e.isFile() || !/\.(png|jpg|jpeg|webp|svg)$/i.test(path)) continue;
      const actual = await digest(path),
        prior = byPath.get(resolve(path).toLowerCase());
      if (prior) {
        requireProof(
          prior.sha256 === actual.sha256,
          'PILOT_HISTORICAL_SOURCE_CHANGED',
        );
        seenHistorical.add(resolve(path).toLowerCase());
      }
      const inherited = byHash.get(actual.sha256) ?? null;
      const entry = library.get(actual.sha256) ?? {
        historical: inherited,
        ...actual,
        aliases: [],
        newClassification: /STAGE(18|19)/i.test(path)
          ? 'EXPERIMENTAL_NOT_PRODUCTION_APPROVED'
          : 'UNVERIFIED_DERIVATIVE_OR_REFERENCE',
      };
      entry.aliases.push(path);
      library.set(actual.sha256, entry);
    }
  }
  for (const folder of ['output', 'reports', 'references'])
    await scan(join(root, folder));
  requireProof(
    seenHistorical.size === byPath.size,
    'PILOT_MISSING_HISTORICAL_SOURCE',
  );
  await mkdir(output, { recursive: false });
  const save = async (name: string, bytes: string | Uint8Array) =>
    writeFile(join(output, name), bytes, { flag: 'wx' });
  const json = async (name: string, value: unknown) =>
    save(name, JSON.stringify(value, null, 2) + '\n');
  const inventory = {
    schemaVersion: 'lammb-stage20-art-library/1.0.0',
    historicalInventory: manifest.approvalInventory,
    boundary:
      'All discovered Studio output/reports/references PNG/JPEG/WebP/SVG bytes, excluding this task. Only pilot PNGs receive strict production-proof decoding. New files do not inherit approval by filename.',
    historicalPathsReverified: seenHistorical.size,
    uniqueArtwork: library.size,
    physicalPaths: [...library.values()].reduce(
      (n, a) => n + a.aliases.length,
      0,
    ),
    assets: [...library.values()].map((a) => ({
      ...(a.historical ?? {}),
      assetId: a.historical?.assetId ?? `unregistered-${a.sha256}`,
      sha256: a.sha256,
      bytes: a.bytes,
      sourcePath: a.historical?.sourcePath ?? a.aliases[0],
      dimensions: a.historical?.dimensions ??
        a.dimensions ?? { status: 'UNINSPECTED_NON_PNG' },
      classification:
        a.historical?.classification ?? 'UNREGISTERED_EXPERIMENT_OR_DERIVATIVE',
      poseFamily: a.historical?.poseFamily ?? 'UNREGISTERED',
      expression: a.historical?.expression ?? 'UNREGISTERED',
      woolProfile: a.historical?.woolProfile ?? 'UNREGISTERED',
      clothing: a.historical?.clothing ?? 'UNREGISTERED',
      accessories: a.historical?.accessories ?? [],
      mutationFamily: a.historical?.mutationFamily ?? 'UNREGISTERED',
      referenceDependencies: a.historical?.referenceDependencies ?? [],
      metadataEligibility:
        'DEVELOPMENT_VISIBLE_FACETS_ONLY_IF_PILOT_SELECTED; NO_FINAL_NFT_ELIGIBILITY',
      aliases: a.aliases,
      approvalStatus: a.historical?.approvalStatus ?? 'UNVERIFIED_APPROVAL',
      proposedArtClass:
        manifest.candidates.find((c) => c.source.sha256 === a.sha256)?.qa
          .proposedClass ??
        (a.historical?.approvalStatus === 'REJECTED'
          ? 'REJECTED'
          : a.historical?.approvalStatus === 'CONDITIONAL_APPROVAL'
            ? 'NEEDS_REFINEMENT'
            : null),
      historicalApprovalPreserved: true,
      pilotSelected: manifest.candidates.some(
        (c) => c.source.sha256 === a.sha256,
      ),
      quarantine:
        a.historical?.approvalStatus === 'REJECTED' ||
        a.historical?.assetId === 'lammb-audit-01-void' ||
        a.newClassification === 'EXPERIMENTAL_NOT_PRODUCTION_APPROVED',
      priorRepairQa: [
        '8e09a02ccee4df742d2ad60d59d35d179c8ccb917cc1e1a9686c088f7762f64c',
        'e0db3d82f3bf83a7661ddf7f1ce5d191189ccda2cce06fbfd3796ed0485bd1c9',
        'a6c55bff62f62521556823b1836da781ab535462ad5a7a5628a7c1f7ec6089b6',
      ].includes(a.sha256)
        ? 'REJECTED_AS_IDENTITY_LOCKED_REPAIR; NOT_RECLASSIFIED_FOR_PRODUCTION'
        : null,
      historicalHashVerified: a.aliases.some((p) =>
        seenHistorical.has(resolve(p).toLowerCase()),
      ),
      provenanceBaseline: a.historical
        ? 'PRESERVED_STAGE15_RECORD'
        : 'NEWLY_BASELINED_NOT_HISTORICAL_VERIFICATION',
      newClassification: a.newClassification,
      observedCorrection:
        a.historical?.assetId === 'lammb-audit-stage12-03-magma'
          ? 'No visible hoodie: volcanic upper body is bare. Original record preserved.'
          : a.historical?.assetId === 'lammb-audit-01-void'
            ? 'Void study mislabeled Skeletal in inherited inventory; remains conditional/family rejected.'
            : null,
      productionRegistrationStatus: 'NOT_PRODUCTION_REGISTERED',
    })),
  };
  await json('ARTWORK_INVENTORY.json', inventory);
  await json('PILOT_MANIFEST.json', manifest);
  const results = [];
  const native: Buffer[] = [],
    small64: Buffer[] = [],
    small128: Buffer[] = [];
  let observedPeakRss = process.memoryUsage().rss;
  for (const c of manifest.candidates) {
    preflight(`candidate ${c.id}`);
    const rendered = await renderPilotCandidate(
      root,
      manifest,
      c.id,
      canonicalSha256(manifest),
      spec,
      registry,
    );
    await save(`${c.id}-native.png`, rendered.bytes);
    await json(`${c.id}-metadata.json`, rendered.metadata);
    await json(`${c.id}-receipt.json`, {
      receipt: rendered.receipt,
      metadataBinding: rendered.binding,
      qa: c.qa,
      observed: c.observed,
    });
    native.push(await sharp(rendered.bytes).removeAlpha().raw().toBuffer());
    for (const size of [64, 128]) {
      const preview = await sharp(rendered.bytes)
        .resize(size, size, { kernel: 'lanczos3' })
        .png()
        .toBuffer();
      await save(`${c.id}-${size}-square.png`, preview);
      const circle = Buffer.from(
        `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
      );
      await save(
        `${c.id}-${size}-circle.png`,
        await sharp(preview)
          .ensureAlpha()
          .composite([{ input: circle, blend: 'dest-in' }])
          .png()
          .toBuffer(),
      );
      (size === 64 ? small64 : small128).push(
        await sharp(preview).removeAlpha().raw().toBuffer(),
      );
    }
    results.push({
      id: c.id,
      ...rendered.receipt,
      metadataBinding: rendered.binding,
      qa: c.qa,
      observed: c.observed,
    });
    observedPeakRss = Math.max(observedPeakRss, process.memoryUsage().rss);
    console.log(`VALIDATED: ${c.id} ${rendered.receipt.imageSha256}`);
  }
  preflight('similarity and review sheets');
  const mae = (a: Buffer, b: Buffer) => {
    requireProof(a.length === b.length, 'PILOT_COMPARE_DIMENSIONS');
    let sum = 0;
    for (let n = 0; n < a.length; n++) sum += Math.abs(a[n]! - b[n]!);
    return sum / a.length / 255;
  };
  const pairs = [];
  for (let a = 0; a < native.length; a++)
    for (let b = a + 1; b < native.length; b++) {
      const at64 = mae(small64[a]!, small64[b]!),
        at128 = mae(small128[a]!, small128[b]!),
        atNative = mae(native[a]!, native[b]!);
      pairs.push({
        a: results[a]!.id,
        b: results[b]!.id,
        normalizedRgbMae64: at64,
        normalizedRgbMae128: at128,
        normalizedRgbMaeNative: atNative,
        needsVisualDuplicateReview: at64 < 0.04,
      });
    }
  requireProof(
    new Set(results.map((r) => r.imageSha256)).size === results.length &&
      new Set(results.map((r) => r.decodedPixelSha256)).size === results.length,
    'PILOT_DUPLICATE_OUTPUT',
  );
  const sheets = [];
  for (const [size, shape] of [
    [256, 'square'],
    [64, 'square'],
    [128, 'square'],
    [64, 'circle'],
    [128, 'circle'],
  ] as const) {
    const cols = 5,
      cell = size + 12,
      height = cell + 36;
    const tiles = [];
    for (let n = 0; n < results.length; n++) {
      tiles.push({
        input: await sharp(
          join(
            output,
            shape === 'circle'
              ? `${results[n]!.id}-${size}-circle.png`
              : `${results[n]!.id}-native.png`,
          ),
        )
          .resize(size, size)
          .png()
          .toBuffer(),
        left: (n % cols) * cell + 6,
        top: Math.floor(n / cols) * height + 30,
      });
      const label = Buffer.from(
        `<svg width="${cell}" height="24"><text x="6" y="17" font-family="Arial" font-size="${size === 64 ? 9 : 12}" fill="#ccff00">${n + 1}. ${results[n]!.id.replace('pilot-', '')}</text></svg>`,
      );
      tiles.push({
        input: label,
        left: (n % cols) * cell,
        top: Math.floor(n / cols) * height,
      });
    }
    const name = `CONTACT_SHEET_${size}${shape === 'circle' ? '_CIRCLE' : ''}.png`;
    await save(
      name,
      await sharp({
        create: {
          width: cols * cell,
          height: Math.ceil(results.length / cols) * height,
          channels: 3,
          background: '#111111',
        },
      })
        .composite(tiles)
        .png()
        .toBuffer(),
    );
    sheets.push(name);
  }
  const pairReport = {
    method:
      'Normalized RGB absolute difference at actual native pixels and separately downsampled 64/128 previews. 0.04 screening threshold is diagnostic, not semantic identity scoring. Common backgrounds bias similarity. Human review required.',
    exactEncodedDuplicates: 0,
    exactDecodedDuplicates: 0,
    pairs,
    nearPairs: pairs
      .filter((p) => p.needsVisualDuplicateReview)
      .sort((a, b) => a.normalizedRgbMae64 - b.normalizedRgbMae64),
  };
  await json('VISUAL_SIMILARITY.json', pairReport);
  const report = {
    purpose: 'DEVELOPMENT_ONLY',
    candidateCount: results.length,
    fullFrameCount: results.filter((r) => r.mode === 'AUTHORED_FULL_FRAME')
      .length,
    compositeCount: results.filter((r) => r.mode === 'REGISTERED_CONTACT')
      .length,
    mutationCount: results.filter((r) => r.observed.mutation !== 'NONE').length,
    imagegenCallCount: 0,
    productionRegisteredCount: 0,
    proposedArtClasses: {
      PRODUCTION_CANDIDATE: results.filter(
        (r) => r.qa.proposedClass === 'PRODUCTION_CANDIDATE',
      ).length,
      NEEDS_REFINEMENT: results.filter(
        (r) => r.qa.proposedClass === 'NEEDS_REFINEMENT',
      ).length,
      REJECTED: 0,
    },
    sourceHashes: {
      historicalPaths: seenHistorical.size,
      changed: 0,
      missing: 0,
      pilotNativeOutputs: results.length,
    },
    sourceBytes: results.reduce((s, r) => s + r.sourceBytes, 0),
    outputBytes: results.reduce((s, r) => s + r.outputBytes, 0),
    dimensions: results.map((r) => ({ id: r.id, ...r.dimensions })),
    runtimeMs: performance.now() - started,
    observedPeakRssBytes: observedPeakRss,
    processLifetimeMaxRssKiB: process.resourceUsage().maxRSS,
    ramPreflights: preflights,
    codecs: sharp.versions,
    metadata:
      '19 schema-valid development examples with reviewed existing facets. Partial vectors; unresolved fields omitted, no tokens or public URIs.',
    framing:
      '2% and 8% diagnostic only. Square portrait cropping may be intentional. Circular preview loss requires visual review; no silhouette percentage certified without reviewed semantic masks.',
    similarity: pairReport.nearPairs,
    contactSheets: sheets,
    results,
    boundaries:
      'Full-frame outputs are immutable source copies, not new generation or compositable layers. Three contacts reconstruct existing registered compatible sources only. Logical 5280 uniqueness is not visual uniqueness.',
  };
  await json('PILOT_RESULTS.json', report);
  await json(
    'ARTIFACT_HASHES.json',
    await Promise.all(
      (await readdir(output))
        .filter((n) => n !== 'ARTIFACT_HASHES.json')
        .map(async (n) => ({ path: n, ...(await digest(join(output, n))) })),
    ),
  );
  console.log(
    JSON.stringify({
      candidateCount: report.candidateCount,
      runtimeMs: report.runtimeMs,
      observedPeakRssBytes: report.observedPeakRssBytes,
      nearPairs: pairReport.nearPairs.length,
    }),
  );
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  requireProof(
    args.length === 5,
    'Usage: stage20-production-pilot.ts STUDIO_ROOT NEW_REPORT_DIR MANIFEST SPEC REGISTRY',
  );
  await runProductionPilot(args[0]!, args[1]!, args[2]!, args[3]!, args[4]!);
}
