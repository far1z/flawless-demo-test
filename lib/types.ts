export interface ScrapeResult {
  screenshot: string;
  html: string;
  url: string;
  title: string;
}

export interface GenerateRequest {
  screenshot: string;
  html: string;
  url: string;
  prompt: string;
}

export interface IterateRequest {
  currentHtml: string;
  instruction: string;
  url: string;
}
