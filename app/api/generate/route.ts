import { NextRequest } from "next/server";
import { getAnthropicClient, MODEL, buildVisionMessages } from "@/lib/claude";
import { GENERATION_SYSTEM_PROMPT } from "@/lib/prompts";
import type { GenerateRequest } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("[generate] POST request received");

  try {
    const body: GenerateRequest = await request.json();
    const { screenshot, html, prompt } = body;

    console.log("[generate] Payload:", {
      screenshotLength: screenshot?.length ?? 0,
      htmlLength: html?.length ?? 0,
      prompt: prompt?.slice(0, 100),
    });

    if (!screenshot || !prompt) {
      console.warn("[generate] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Screenshot and prompt are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = getAnthropicClient();
    const messages = buildVisionMessages(screenshot, html, prompt);

    console.log(`[generate] Calling Claude (model: ${MODEL}) with vision message...`);
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system: GENERATION_SYSTEM_PROMPT,
      messages,
    });
    console.log(`[generate] Stream created in ${Date.now() - startTime}ms`);

    const encoder = new TextEncoder();
    let chunkCount = 0;
    let totalChars = 0;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              chunkCount++;
              totalChars += event.delta.text.length;
              if (chunkCount % 50 === 0) {
                console.log(`[generate] Streaming... chunks=${chunkCount}, chars=${totalChars}, elapsed=${Date.now() - startTime}ms`);
              }
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          console.log(`[generate] Stream complete: ${chunkCount} chunks, ${totalChars} chars, ${Date.now() - startTime}ms total`);
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error(`[generate] Stream error after ${chunkCount} chunks:`, error);
          const errorData = JSON.stringify({
            error: "Generation failed",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error(`[generate] Fatal error after ${Date.now() - startTime}ms:`, error);
    return new Response(
      JSON.stringify({ error: "Failed to start generation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
