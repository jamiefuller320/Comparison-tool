async function main() {
  const {
    ACCOUNT_PROMPT_MIN_SCHOOLS,
    buildShortlistSnapshot,
    isValidEmail,
    normalizeEmail,
    createLocalAccountBackend,
  } = await import("../src/lib/account/testExports.ts");

  if (ACCOUNT_PROMPT_MIN_SCHOOLS !== 2) {
    console.error("FAIL prompt threshold", ACCOUNT_PROMPT_MIN_SCHOOLS);
    process.exit(1);
  }
  if (!isValidEmail("parent@example.com") || isValidEmail("not-an-email")) {
    console.error("FAIL email validation");
    process.exit(1);
  }
  if (normalizeEmail("  A@B.Com ") !== "a@b.com") {
    console.error("FAIL normalizeEmail");
    process.exit(1);
  }

  const snap = buildShortlistSnapshot({
    schools: ["116338", "116338", "999", "1", "2", "3"],
    stages: ["ks2"],
    sectors: ["state"],
    postcode: " SO40 2HR ",
    includeVisitLog: false,
  });
  if (snap.version !== 1 || snap.schools.length !== 4) {
    console.error("FAIL snapshot schools cap", snap.schools);
    process.exit(1);
  }
  if (snap.postcode !== "SO40 2HR") {
    console.error("FAIL snapshot postcode", snap.postcode);
    process.exit(1);
  }

  // Local backend round-trip with a memory-like localStorage shim.
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
  };

  const backend = createLocalAccountBackend();
  if (backend.kind !== "local") {
    console.error("FAIL local backend kind");
    process.exit(1);
  }
  const sign = await backend.requestSignIn("Parent@Example.com");
  if (!sign.ok || sign.mode !== "local") {
    console.error("FAIL local sign-in", sign);
    process.exit(1);
  }
  const session = await backend.getSession();
  if (!session || session.email !== "parent@example.com") {
    console.error("FAIL session", session);
    process.exit(1);
  }
  const saved = await backend.saveShortlist(snap);
  if (!saved.id || saved.schools[0] !== "116338") {
    console.error("FAIL save", saved);
    process.exit(1);
  }
  const list = await backend.listShortlists();
  if (list.length !== 1 || list[0].id !== saved.id) {
    console.error("FAIL list", list);
    process.exit(1);
  }
  await backend.signOut();
  if (await backend.getSession()) {
    console.error("FAIL signOut left a session");
    process.exit(1);
  }

  console.log("OK account module");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
