/**
 * T049: Run Lighthouse on dashboard (ROI comparison, COA comparison flows).
 * Constitution §6: Performance and Best Practices ≥ 90.
 *
 * Usage: pnpm lighthouse:dashboard [url]
 * Default URL: http://localhost:3000/dashboard
 *
 * Prerequisite: Use production build for accurate scores:
 *   pnpm --filter web build && PORT=3002 pnpm --filter web start
 *   LIGHTHOUSE_URL=http://localhost:3002/dashboard pnpm lighthouse:dashboard
 *
 * Note: Dashboard may redirect when unauthenticated. For full ROI/COA audit
 * (90+ Performance), run manually in Chrome DevTools while logged in.
 */
import * as fs from "fs";
import * as path from "path";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const MIN_PERFORMANCE = 90;
const MIN_BEST_PRACTICES = 90;
const DEFAULT_URL = "http://localhost:3000/dashboard";

async function run() {
  const url = process.argv[2] ?? process.env.LIGHTHOUSE_URL ?? DEFAULT_URL;
  const outDir = path.join(process.cwd(), ".lighthouse");

  console.log(`Running Lighthouse on ${url}...`);
  console.log(
    `(Dashboard may redirect to login if not authenticated. For ROI/COA audit, run manually when logged in.)\n`
  );

  const chrome = await chromeLauncher.launch({
    chromeFlags: [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
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

    console.log(
      `Performance:      ${perfScore.toFixed(0)} (min: ${MIN_PERFORMANCE})`
    );
    console.log(
      `Best Practices:  ${bpScore.toFixed(0)} (min: ${MIN_BEST_PRACTICES})`
    );

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const reportPath = path.join(outDir, "dashboard-report.html");
    const report = result.report;
    if (report) {
      fs.writeFileSync(
        reportPath,
        typeof report === "string" ? report : report.join("")
      );
      console.log(`\nReport saved to ${reportPath}`);
    }

    const pass =
      perfScore >= MIN_PERFORMANCE && bpScore >= MIN_BEST_PRACTICES;
    if (!pass) {
      console.error(
        "\n❌ T049 failed: Performance and/or Best Practices below 90."
      );
      process.exit(1);
    }
    console.log("\n✅ T049 passed: Performance and Best Practices ≥ 90.");
  } finally {
    await chrome.kill();
  }
}

run().catch((err) => {
  console.error("Lighthouse run failed:", err);
  process.exit(1);
});
