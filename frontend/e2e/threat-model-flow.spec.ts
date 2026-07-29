import { test, expect } from "@playwright/test";
import path from "node:path";

const FIXTURE_PDF = path.join(process.cwd(), "..", "fixtures", "intel", "advisory.pdf");

test("create project, ingest intel, run the pipeline, and review the DFD/report", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Intel-Threat-Modeller");

  const projectName = `E2E Playwright Project ${Date.now()}`;
  await page.locator('input[required]').first().fill(projectName);
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]+$/);

  await expect(page.getByRole("heading", { name: "Design document" })).toBeVisible();
  await page.locator("textarea[required]").fill("A simple 3-tier web app: a browser, an API gateway, and a database.");
  await page.locator("textarea:not([required])").first().fill("flowchart LR\n  Browser-->API\n  API-->DB[(Database)]");
  await page.getByRole("button", { name: "Save design doc" }).click();
  await expect(page.getByText("Design doc saved.")).toBeVisible();

  await page.setInputFiles('input[type="file"]', FIXTURE_PDF);
  await expect(page.getByText("processed")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Run threat model" }).click();
  const runLink = page.locator('a[href*="/runs/"]').first();
  await expect(runLink).toBeVisible({ timeout: 10_000 });
  await runLink.click();
  await page.waitForURL(/\/runs\/[0-9a-f-]+$/);

  await expect(page.getByRole("heading", { name: /enterprise run/ })).toContainText("succeeded", { timeout: 20_000 });

  // DFD: exactly the 3 canned components, excluding the trust-boundary group nodes.
  const componentNodes = page.locator('.react-flow__node:not([data-id^="boundary:"])');
  await expect(componentNodes).toHaveCount(3);

  // Attack paths: at least one risk badge should carry the intel-adjustment rationale
  // in its title, proving the ingested advisory's signal actually moved that score.
  await expect(page.getByRole("heading", { name: /Attack paths/ })).toBeVisible();
  const intelBadge = page.locator('span[title*="Intel:"]').first();
  await expect(intelBadge).toBeVisible();
  await expect(intelBadge).toHaveAttribute("title", /active-exploitation/);

  // Report: audience tabs and downloads.
  await expect(page.getByRole("heading", { name: "Report" })).toBeVisible();
  await expect(page.getByRole("button", { name: "executive" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ciso" })).toBeVisible();
  await expect(page.getByRole("button", { name: "technical" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Risk register CSV" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ATT&CK Navigator layer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Full JSON dump" })).toBeVisible();
});
