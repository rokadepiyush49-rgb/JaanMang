#!/usr/bin/env node
/**
 * Fan the root .env out to the per-app environment files.
 *
 *   node scripts/sync-env.mjs [--dry-run] [--force]
 *
 * Three processes need configuration and several values are shared between
 * them, so the root .env is the source and this writes the derived files:
 *
 *   .env  ->  backend/.env            (the NestJS API)
 *         ->  apps/web/.env.local     (the Next.js web app)
 *         ->  a --dart-define line printed for the Flutter app
 *
 * The rule that makes this safe to run at any time: A BLANK VALUE IN THE ROOT
 * .env CHANGES NOTHING. Your local backend/.env already holds a working
 * DATABASE_URL and a dev JWT pair; leaving those blank in the root file means
 * this script leaves them exactly as they are. Only a value you actually typed
 * is propagated. Pass --force to let a blank root value clear a target key,
 * which is almost never what you want.
 *
 * Unknown keys in a target file are preserved, along with its comments and its
 * ordering — this rewrites the lines it owns and copies the rest through.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = new Set(process.argv.slice(2));
const DRY = argv.has('--dry-run');
const FORCE = argv.has('--force');

/**
 * Which root keys each target gets, and under what name.
 *
 * A string maps a root key to the same name; `[root, target]` renames it. The
 * renames are real differences, not tidying: the web app reaches the API as
 * BACKEND_API_URL server-side, while the API describes itself in OpenAPI as
 * PUBLIC_API_URL, and both need to be settable independently.
 */
const TARGETS = [
  {
    label: 'backend/.env',
    path: join(ROOT, 'backend', '.env'),
    template: join(ROOT, 'backend', '.env.example'),
    keys: [
      'DATABASE_URL',
      'DIRECT_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'CORS_ORIGINS',
      'PUBLIC_API_URL',
      'GROQ_API_KEY',
      'GEMINI_API_KEY',
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET',
      'R2_PUBLIC_BASE_URL',
      'FCM_SERVICE_ACCOUNT_JSON',
      'RECOMMENDER_URL',
    ],
  },
  {
    label: 'apps/web/.env.local',
    path: join(ROOT, 'apps', 'web', '.env.local'),
    template: join(ROOT, 'apps', 'web', '.env.example'),
    keys: ['BACKEND_API_URL', 'GROQ_API_KEY', 'GROQ_MODEL', 'GROQ_DEBATE_MODEL'],
  },
];

/** Parse a dotenv file into a Map. Values are taken verbatim, quotes stripped. */
function parse(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    out.set(m[1], value);
  }
  return out;
}

/**
 * Rewrite `key=` lines in place, appending any the file does not yet have.
 * Comments, blank lines, ordering and unrelated keys are copied through, so a
 * target file keeps the documentation it was written with.
 */
function apply(text, updates) {
  const lines = text.split('\n');
  const seen = new Set();
  const next = lines.map((line) => {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (!m || !updates.has(m[1])) return line;
    seen.add(m[1]);
    return `${m[1]}=${updates.get(m[1])}`;
  });
  const missing = [...updates].filter(([k]) => !seen.has(k));
  if (missing.length > 0) {
    if (next.at(-1)?.trim() !== '') next.push('');
    next.push('# Added by scripts/sync-env.mjs from the root .env.');
    for (const [k, v] of missing) next.push(`${k}=${v}`);
    next.push('');
  }
  return next.join('\n');
}

const rootPath = join(ROOT, '.env');
if (!existsSync(rootPath)) {
  if (DRY) {
    console.error('No .env at the repository root. Run: cp .env.example .env');
    process.exit(1);
  }
  copyFileSync(join(ROOT, '.env.example'), rootPath);
  console.log('Created .env from .env.example. Fill in what you have and run this again.\n');
}

const root = parse(readFileSync(rootPath, 'utf8'));
let changedFiles = 0;

for (const target of TARGETS) {
  if (!existsSync(target.path)) {
    if (!existsSync(target.template)) {
      console.log(`skip  ${target.label} — no file and no template to create it from`);
      continue;
    }
    if (!DRY) copyFileSync(target.template, target.path);
    console.log(`create ${target.label} from ${target.label.replace(/[^/]+$/, '')}.env.example`);
  }

  const current = existsSync(target.path) ? readFileSync(target.path, 'utf8') : '';
  const existing = parse(current);
  const updates = new Map();
  const skipped = [];

  for (const entry of target.keys) {
    const [from, to] = Array.isArray(entry) ? entry : [entry, entry];
    const value = root.get(from) ?? '';
    if (value === '' && !FORCE) {
      if ((existing.get(to) ?? '') === '') skipped.push(to);
      continue;
    }
    if (existing.get(to) === value) continue;
    updates.set(to, value);
  }

  if (updates.size === 0) {
    console.log(`ok    ${target.label} — nothing to change` + (skipped.length ? ` (${skipped.length} still blank)` : ''));
    continue;
  }

  console.log(`${DRY ? 'would write' : 'write'} ${target.label}`);
  for (const [k, v] of updates) {
    const secret = /SECRET|KEY|PASSWORD|URL/.test(k) && v.length > 8;
    console.log(`        ${k} = ${secret ? `${v.slice(0, 4)}…${v.slice(-2)} (${v.length} chars)` : v || '(blank)'}`);
  }
  if (!DRY) {
    writeFileSync(target.path, apply(current, updates));
    changedFiles += 1;
  }
}

// The Flutter app takes no .env — it is configured at build time.
const dartDefines = [
  ['USE_MOCKS', root.get('FLUTTER_USE_MOCKS')],
  ['MAPS_ENABLED', root.get('FLUTTER_MAPS_ENABLED')],
  ['DEMO_SIGNED_IN', root.get('FLUTTER_DEMO_SIGNED_IN')],
].filter(([, v]) => v !== undefined && v !== '');

if (dartDefines.length > 0) {
  console.log('\napps/citizen-app takes no .env — build it with:');
  console.log(`  flutter run ${dartDefines.map(([k, v]) => `--dart-define=${k}=${v}`).join(' ')}`);
}

console.log(
  DRY
    ? '\nDry run — nothing written.'
    : `\n${changedFiles} file${changedFiles === 1 ? '' : 's'} updated. Blank values in the root .env were left alone.`,
);
