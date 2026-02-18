/**
 * T041 / SC-007: Run Lighthouse on discovery flow; verify Performance and Best Practices ≥ 90.
 * Trigger view (idle) is audited by default. For status poll and results views, run Lighthouse
 * manually in Chrome DevTools while logged in.
 *
 * Usage: pnpm lighthouse:discovery [url]
 * Default URL: http://localhost:3000/discovery
 *
 * Prerequisite: Start dev server with `pnpm --filter web dev`
 */
import * as fs from "fs";
import * as path from "path";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const MIN_PERFORMANCE = 90;
const MIN_BEST_PRACTICES = 90;
const DEFAULT_URL = "http://localhost:3000/discovery";

async function run() {
  const url = process.argv[2] ?? process.env.LIGHTHOUSE_URL ?? DEFAULT_URL;
  const outDir = path.join(process.cwd(), ".lighthouse");

  console.log(`Running Lighthouse on ${url}...`);
  console.log("(Trigger view only. For status poll and results views, run manually in Chrome DevTools when logged in.)\n");

  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "html",
      onlyCategories: ["performance", "best-practices"],
      logLevel: "error",
    });

    if (!result?.lhr) {
      throw new Error("Lighthouse did not return a valid result");
    }

    const lhr = result.lhr;
    const perfScore = (lhr.categories.performance?.score ?? 0) * 100;
    const bpScore = (lhr.categories["best-practices"]?.score ?? 0) * 100;

    console.log(`Performance:      ${perfScore.toFixed(0)} (min: ${MIN_PERFORMANCE})`);
    console.log(`Best Practices:   ${bpScore.toFixed(0)} (min: ${MIN_BEST_PRACTICES})`);

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const reportPath = path.join(outDir, "discovery-report.html");
    const report = result.report;
    if (report) {
      fs.writeFileSync(reportPath, typeof report === "string" ? report : report.join(""));
      console.log(`\nReport saved to ${reportPath}`);
    }

    const pass = perfScore >= MIN_PERFORMANCE && bpScore >= MIN_BEST_PRACTICES;
    if (!pass) {
      console.error("\n❌ SC-007 failed: Performance and/or Best Practices below 90.");
      process.exit(1);
    }
    console.log("\n✅ SC-007 passed: Performance and Best Practices ≥ 90.");
  } finally {
    await chrome.kill();
  }
}

run().catch((err) => {
  console.error("Lighthouse run failed:", err);
  process.exit(1);
});
