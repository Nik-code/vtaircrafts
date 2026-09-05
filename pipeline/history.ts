// Fetch and parse everything the event log is built from: archived copies of the two DGCA
// operator lists, and the DGCA registration / de-registration / ownership-change reports.
//
//   npx tsx pipeline/history.ts            # fetch what is missing, then parse everything
//   npx tsx pipeline/history.ts --no-fetch # re-parse what is already on disk
//
// Idempotent: files already present are never re-downloaded, and the Archive is queried
// sequentially with backoff. The output under data/raw/wayback, data/raw/reports,
// data/parsed/history and data/parsed/reports is static and committed; pipeline/build.ts
// reads it and appends the current month's snapshot to the chain.
import { parseCaptures } from "./history/captures";
import { fetchReports, parseAllReports } from "./history/reports";
import { fetchAll, type ListName } from "./history/wayback";

const LISTS: ListName[] = ["scheduled", "non-scheduled"];

async function main() {
  const fetch = !process.argv.includes("--no-fetch");

  if (fetch) {
    console.log("== Wayback captures");
    await fetchAll();
    console.log("\n== DGCA registration reports");
    await fetchReports();
  }

  console.log("\n== Parsing captures");
  for (const list of LISTS) {
    console.log(`-- ${list}`);
    const report = parseCaptures(list);
    console.log(
      `   ${report.written.length} snapshot(s), ${report.duplicates.length} duplicate as-on date(s), ${report.unusable.length} unusable`,
    );
  }

  console.log("\n== Parsing reports");
  const reports = parseAllReports();
  const rows = reports.reduce((s, r) => s + r.rows.length, 0);
  const dropped = reports.reduce((s, r) => s + r.dropped.length, 0);
  const bad = reports.flatMap((r) => r.rows.filter((x) => !/^VT-[A-Z]{3}$/.test(x.reg)));
  console.log(`   ${rows} row(s) across ${reports.length} report(s), ${dropped} dropped, ${bad.length} invalid registration(s)`);
  if (bad.length) throw new Error(`invalid registrations: ${bad.map((b) => b.reg).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
