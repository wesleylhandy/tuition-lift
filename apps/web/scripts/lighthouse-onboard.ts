/**
 * T032: Run Lighthouse on /onboard; verify Performance, Best Practices, Accessibility ≥ 90.
 * Constitution §6: WCAG 2.1 AA; Lighthouse Mobile 90+.
 *
 * Usage: pnpm lighthouse:onboard [url]
 * Default URL: http://localhost:3000/onboard
 *
 * Prerequisite: Start dev server with `pnpm --filter web dev`
 */
import * as fs from "fs";
import * as path from "path";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const MIN_SCORE = 90;
const DEFAULT_URL = "http://localhost:3000/onboard";

const CATEGORIES = ["performance", "best-practices", "accessibility"] as const;

async function run() {
  const url = process.argv[2] ?? process.env.LIGHTHOUSE_URL ?? DEFAULT_URL;
  const outDir = path.join(process.cwd(), ".lighthouse");

  console.log(`Running Lighthouse on ${url}...`);
  console.log(`Categories: ${CATEGORIES.join(", ")} (min: ${MIN_SCORE} each)\n`);

  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "html",
      onlyCategories: [...CATEGORIES],
      logLevel: "error",
    });

    if (!result?.lhr) {
      throw new Error("Lighthouse did not return a valid result");
    }

    const lhr = result.lhr;
    const scores: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      const score = (lhr.categories[cat]?.score ?? 0) * 100;
      scores[cat] = score;
      console.log(`${cat.padEnd(18)} ${score.toFixed(0)} (min: ${MIN_SCORE})`);
    }

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const reportPath = path.join(outDir, "onboard-report.html");
    const report = result.report;
    if (report) {
      fs.writeFileSync(reportPath, typeof report === "string" ? report : report.join(""));
      console.log(`\nReport saved to ${reportPath}`);
    }

    const pass = CATEGORIES.every((cat) => (scores[cat] ?? 0) >= MIN_SCORE);
    if (!pass) {
      console.error(`\n❌ T032 failed: one or more scores below ${MIN_SCORE}.`);
      process.exit(1);
    }
    console.log(`\n✅ T032 passed: Performance, Best Practices, Accessibility ≥ ${MIN_SCORE}.`);
  } finally {
    await chrome.kill();
  }
}

run().catch((err) => {
  console.error("Lighthouse run failed:", err);
  process.exit(1);
});
