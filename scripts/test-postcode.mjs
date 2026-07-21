const cases = [
  ["SO40 2HR", "SO40 2HR"],
  ["so402hr", "SO40 2HR"],
  ["SO40-2HR", "SO40 2HR"],
  ["  so40.2hr ", "SO40 2HR"],
  ["M1 1AE", "M1 1AE"],
  ["m11ae", "M1 1AE"],
  ["EC1A 1BB", "EC1A 1BB"],
  ["ec1a1bb", "EC1A 1BB"],
  ["SO40", null],
  ["not a postcode", null],
];

async function main() {
  const { parseUkPostcode } = await import("../src/lib/postcode.ts");
  for (const [input, expected] of cases) {
    const got = parseUkPostcode(input);
    if (got !== expected) {
      console.error("FAIL", input, "got", got, "expected", expected);
      process.exit(1);
    }
  }
  console.log(`postcode parser ok (${cases.length} cases)`);
}

main();
