import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraper";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Basic URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL. Please enter a valid http or https URL." },
        { status: 400 }
      );
    }

    const result = await scrapeUrl(parsedUrl.toString());

    return NextResponse.json({
      screenshot: result.screenshot,
      html: result.html,
      title: result.title,
      url: result.url,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Failed to scrape the URL. Please try again." },
      { status: 500 }
    );
  }
}
