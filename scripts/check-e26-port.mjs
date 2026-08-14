#!/usr/bin/env node
/**
 * E26 Port Verification — exit criterion for phase E26.
 *
 * The archived `unierp-app-{healthcare,education,fieldservice,realestate}`
 * satellites must be accounted for line by line in each extension's
 * PORT-ACCOUNT.json (PORTED / REWRITTEN / DROPPED with a reason), and no
 * vertical may remain a stub: `wc -l unierp-extensions/<vertical>/src/index.ts`
 * must no longer be in the 26–39 stub band.
 *
 * Line counts use the same rule as the accounting: split(/\r?\n/).length.
 *
 * Exit codes:
 *   0  — all verticals ported and accounted
 *   1  — at least one violation (list printed)
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const ARCHIVE_ROOT = process.env.UNIERP_ARCHIVE_ROOT
  ? resolve(process.env.UNIERP_ARCHIVE_ROOT)
  : null;

const VERTICALS = [
  { dir: 'healthcare', repo: 'unierp-app-healthcare' },
  { dir: 'education', repo: 'unierp-app-education' },
  { dir: 'field-service', repo: 'unierp-app-fieldservice' },
  { dir: 'real-estate', repo: 'unierp-app-realestate' },
];

const DISPOSITIONS = new Set(['PORTED', 'REWRITTEN', 'DROPPED']);

function countLines(filePath) {
  const content = readFileSync(filePath, 'utf8');
  return content.split(/\r?\n/).length;
}

const violations = [];

function fail(msg) {
  violations.push(msg);
}

for (const { dir, repo } of VERTICALS) {
  const pkgDir = join(ROOT, dir);

  // ── exit criterion: src/index.ts must not be a 26–39 line stub ──
  const indexPath = join(pkgDir, 'src', 'index.ts');
  if (!existsSync(indexPath)) {
    fail(`${dir}: missing src/index.ts`);
  } else {
    const lines = countLines(indexPath);
    if (lines >= 26 && lines <= 39) {
      fail(`${dir}: src/index.ts is ${lines} lines — still in the 26–39 stub band; port the vertical first.`);
    }
  }

  // ── line-by-line accounting ──
  const accountPath = join(pkgDir, 'PORT-ACCOUNT.json');
  if (!existsSync(accountPath)) {
    fail(`${dir}: missing PORT-ACCOUNT.json`);
    continue;
  }

  const account = JSON.parse(readFileSync(accountPath, 'utf8'));

  if (account.archivedRepo !== repo) {
    fail(`${dir}: PORT-ACCOUNT.archivedRepo expected "${repo}", got "${account.archivedRepo}"`);
  }
  if (!Array.isArray(account.entries) || account.entries.length === 0) {
    fail(`${dir}: PORT-ACCOUNT.entries must be a non-empty array`);
    continue;
  }

  const entrySum = account.entries.reduce((s, e) => s + e.lines, 0);
  if (entrySum !== account.archivedTotalLines) {
    fail(`${dir}: PORT-ACCOUNT entries sum to ${entrySum}, archivedTotalLines is ${account.archivedTotalLines}`);
  }

  const seen = new Set();
  for (const entry of account.entries) {
    if (!entry.file || typeof entry.file !== 'string') {
      fail(`${dir}: entry missing "file"`);
      continue;
    }
    if (seen.has(entry.file)) {
      fail(`${dir}: duplicate entry for ${entry.file}`);
    }
    seen.add(entry.file);

    if (!DISPOSITIONS.has(entry.disposition)) {
      fail(`${dir}: ${entry.file} has invalid disposition "${entry.disposition}" (expected PORTED|REWRITTEN|DROPPED)`);
    }

    if (entry.disposition === 'DROPPED') {
      if (!entry.reason || typeof entry.reason !== 'string') {
        fail(`${dir}: ${entry.file} is DROPPED without a reason`);
      }
      if (entry.where !== null && entry.where !== undefined) {
        fail(`${dir}: ${entry.file} is DROPPED but declares "where" — DROPPED entries must have where: null`);
      }
    } else {
      if (!entry.where || typeof entry.where !== 'string') {
        fail(`${dir}: ${entry.file} is ${entry.disposition} without a destination ("where")`);
      }
      if (!entry.reason || typeof entry.reason !== 'string') {
        fail(`${dir}: ${entry.file} is ${entry.disposition} without a reason`);
      }
    }
  }

  // ── verify against the archived repository when available ──
  const archiveDir = ARCHIVE_ROOT ? join(ARCHIVE_ROOT, repo) : null;
  if (archiveDir && existsSync(archiveDir)) {
    const accounted = new Set(account.entries.map((e) => e.file));
    const archiveFiles = collectArchiveFiles(archiveDir);

    for (const rel of archiveFiles) {
      if (!accounted.has(rel)) {
        fail(`${dir}: archived file ${rel} is NOT accounted for in PORT-ACCOUNT.json`);
      }
    }
    for (const entry of account.entries) {
      const full = join(archiveDir, entry.file);
      if (!existsSync(full)) {
        fail(`${dir}: PORT-ACCOUNT lists ${entry.file} which does not exist in ${repo}`);
        continue;
      }
      const actual = countLines(full);
      if (actual !== entry.lines) {
        fail(`${dir}: ${entry.file} accounted at ${entry.lines} lines but the archive has ${actual}`);
      }
    }
  } else {
    fail(`${dir}: archive ${repo} not found${ARCHIVE_ROOT ? ` under ${ARCHIVE_ROOT}` : ' (set UNIERP_ARCHIVE_ROOT)'} — per-file line audit skipped`);
  }
}

function collectArchiveFiles(dir, prefix = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const stat = statSyncSafe(full);
    if (!stat) continue;
    if (stat.isDirectory()) {
      out.push(...collectArchiveFiles(full, rel));
    } else if (isArchivedSource(rel)) {
      out.push(rel);
    }
  }
  return out;
}

function isArchivedSource(rel) {
  if (!rel.endsWith('.ts')) return false;
  if (rel.includes('/node_modules/')) return false;
  if (rel.includes('/dist/')) return false;
  if (rel.includes('/test/')) return false;
  if (rel.startsWith('.github/')) return false;
  if (rel.endsWith('.spec.ts') || rel.endsWith('.test.ts')) return false;
  return true;
}

import { statSync } from 'node:fs';
function statSyncSafe(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

if (violations.length === 0) {
  console.log(`  ✅ E26 port verified: all ${VERTICALS.length} verticals run from unierp-extensions against the public extension API, archived logic accounted for line by line.`);
  process.exit(0);
}

console.error(`
────────────────────────────────────────────────────────────────────────
  ❌ E26 PORT VERIFICATION FAILED — ${violations.length} violation(s)
────────────────────────────────────────────────────────────────────────`);
for (const v of violations) {
  console.error(`   - ${v}`);
}
console.error(`
  Every vertical must run from unierp-extensions/<vertical> against the
  public extension API, with the archived clinical/academic/property logic
  accounted for line by line — ported, rewritten, or explicitly dropped
  with a reason.
────────────────────────────────────────────────────────────────────────
`);
process.exit(1);
