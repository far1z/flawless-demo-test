import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import type { ScrapeResult } from "./types";

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  console.log("[scraper] Launching browser...");
  const startTime = Date.now();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 800 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  console.log(`[scraper] Browser launched in ${Date.now() - startTime}ms`);

  try {
    const page = await browser.newPage();

    console.log(`[scraper] Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    console.log(`[scraper] Page loaded in ${Date.now() - startTime}ms`);

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: false,
    });
    const screenshot = Buffer.from(screenshotBuffer).toString("base64");
    console.log(`[scraper] Screenshot taken: ${screenshot.length} chars base64`);

    // Get page title
    const title = await page.title();

    // Extract cleaned HTML
    const html = await page.evaluate(() => {
      const clone = document.documentElement.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("script").forEach((el) => el.remove());
      clone.querySelectorAll("style").forEach((el) => el.remove());
      clone.querySelectorAll("svg").forEach((el) => el.remove());
      clone.querySelectorAll("noscript").forEach((el) => el.remove());
      clone.querySelectorAll("iframe").forEach((el) => el.remove());
      return clone.outerHTML;
    });

    const cleanedHtml = html.slice(0, 50000);
    console.log(`[scraper] Done in ${Date.now() - startTime}ms — title: "${title}", html: ${cleanedHtml.length} chars`);

    return {
      screenshot,
      html: cleanedHtml,
      url,
      title,
    };
  } finally {
    await browser.close();
  }
}
