// Bumps the version in spindle.json and package.json together.
// Usage: bun scripts/bump-version.ts <patch|minor|major>
export {};

const level = process.argv[2];
if (level !== "patch" && level !== "minor" && level !== "major") {
  console.error("usage: bun scripts/bump-version.ts <patch|minor|major>");
  process.exit(1);
}

const files = ["spindle.json", "package.json"];
const docs = await Promise.all(files.map(async (f) => ({ f, json: await Bun.file(f).json() })));
const current = docs[0]!.json.version as string;
for (const d of docs) {
  if (d.json.version !== current) {
    console.error(`${d.f} has version ${d.json.version}, spindle.json has ${current}; fix them by hand first`);
    process.exit(1);
  }
}

const [major, minor, patch] = current.split(".").map(Number) as [number, number, number];
const next =
  level === "major" ? `${major + 1}.0.0` : level === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

for (const d of docs) {
  d.json.version = next;
  await Bun.write(d.f, `${JSON.stringify(d.json, null, 2)}\n`);
}
console.log(`${current} → ${next}`);
