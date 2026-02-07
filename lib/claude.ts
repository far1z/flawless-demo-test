import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-6";

export function buildVisionMessages(
  screenshot: string,
  html: string,
  prompt: string
): Anthropic.MessageParam[] {
  return [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: screenshot,
          },
        },
        {
          type: "text",
          text: `Here is the HTML structure of the website (truncated):\n\n${html.slice(0, 30000)}\n\nUser request: ${prompt}`,
        },
      ],
    },
  ];
}

export function buildIterationMessages(
  currentHtml: string,
  instruction: string
): Anthropic.MessageParam[] {
  return [
    {
      role: "user",
      content: `Here is the current HTML prototype:\n\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nPlease make the following changes: ${instruction}`,
    },
  ];
}
