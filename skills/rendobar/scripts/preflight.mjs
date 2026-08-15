#!/usr/bin/env node
/**
 * Rendobar preflight. Run this BEFORE writing integration code.
 *
 * Black box: run it with --help, read its output, do not read this source. It
 * exists to be executed, not ingested into context.
 *
 * Checks, in order, and stops at the first failure with a fix:
 *   1. RENDOBAR_API_KEY present and shaped like a key
 *   2. the key authenticates against the live API
 *   3. the org has credit to spend
 *   4. the live job catalog, so you never guess a type
 */
const API = process.env.RENDOBAR_API_URL ?? "https://api.rendobar.com";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Rendobar preflight

Usage:
  node scripts/preflight.mjs            run every check
  node scripts/preflight.mjs --types    print the live job catalog only

Env:
  RENDOBAR_API_KEY   required, read from the environment, never printed
  RENDOBAR_API_URL   optional override, defaults to ${API}

Exit codes:
  0 ready    1 blocked (the message says what to fix)`);
  process.exit(0);
}

const key = process.env.RENDOBAR_API_KEY;
const fail = (msg) => {
  console.error(`BLOCKED: ${msg}`);
  process.exit(1);
};

async function api(path, auth = true) {
  const res = await fetch(`${API}${path}`, {
    headers: auth ? { Authorization: `Bearer ${key}` } : {},
    signal: AbortSignal.timeout(20_000),
  });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
}

// The catalog is public, so this works before a key exists.
const types = await api("/jobs/types", false);
if (!types.ok) fail(`the API is unreachable at ${API} (status ${types.status})`);
const names = (types.body?.data ?? []).map((t) => t.type);

if (process.argv.includes("--types")) {
  for (const t of types.body.data) {
    console.log(`${t.type.padEnd(18)} ${t.summary} [${(t.acceptsMedia ?? []).join(", ")}]`);
  }
  process.exit(0);
}

if (!key) {
  fail(
    "RENDOBAR_API_KEY is not set. Ask the user to put it in a gitignored env " +
      "file, never in chat. Create one at https://app.rendobar.com/api-keys",
  );
}
if (!key.startsWith("rb_")) {
  fail("RENDOBAR_API_KEY does not start with rb_, so it is not a Rendobar key.");
}

const me = await api("/orgs/current");
if (me.status === 401) {
  fail(
    "the key was rejected. It is reaching the process, so it is invalid, " +
      "revoked, or issued for a different environment (a staging key against production).",
  );
}
if (!me.ok) fail(`unexpected ${me.status} from /orgs/current`);

const billing = await api("/billing/state");
const balance = billing.body?.data?.balance?.amount;
const plan = billing.body?.data?.plan;

console.log("READY");
console.log(`  api        ${API}`);
console.log(`  key        valid (${key.slice(0, 6)}...)`);
console.log(`  plan       ${plan?.name ?? "unknown"}`);
console.log(
  `  balance    ${typeof balance === "number" ? `$${balance.toFixed(2)}` : "unknown"}`,
);
console.log(`  job types  ${names.length}: ${names.join(", ")}`);
console.log(
  "\nNext: read the per-type schema before building params:\n" +
    `  curl ${API}/jobs/types/<type>/schema`,
);
if (typeof balance === "number" && balance <= 0) {
  console.log("\nWARNING: balance is zero, submits will fail with INSUFFICIENT_CREDITS.");
}
