import { chromium, type Browser } from "playwright";
import type { ScrapeResult } from "./types";

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: false,
    });
    const screenshot = screenshotBuffer.toString("base64");

    // Get page title
    const title = await page.title();

    // Extract cleaned HTML
    const html = await page.evaluate(() => {
      // Clone the document
      const clone = document.documentElement.cloneNode(true) as HTMLElement;

      // Remove scripts
      clone.querySelectorAll("script").forEach((el) => el.remove());
      // Remove style tags (keep inline styles)
      clone.querySelectorAll("style").forEach((el) => el.remove());
      // Remove SVGs to save space
      clone.querySelectorAll("svg").forEach((el) => el.remove());
      // Remove noscript
      clone.querySelectorAll("noscript").forEach((el) => el.remove());
      // Remove iframes
      clone.querySelectorAll("iframe").forEach((el) => el.remove());

      return clone.outerHTML;
    });

    // Cap HTML at 50K chars
    const cleanedHtml = html.slice(0, 50000);

    return {
      screenshot,
      html: cleanedHtml,
      url,
      title,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
